# Architecture

How WatchCrop is put together, and the load-bearing decisions.

## Stack

- **Next.js 15** (App Router) — one deployable unit; UI + API in the same project.
- **Drizzle ORM** over **Postgres**, with a **dual driver** (see below).
- **Tailwind v4** for styling.
- **Fuse.js** for client-side fuzzy autocomplete.
- **sharp** for the production image-crop pipeline (offline script).
- Deploys to **Vercel** (functions are Node runtime — required by `postgres` / `pglite` / `node:crypto`).

## Directory map

```
app/
  page.tsx                     Landing + waitlist (de-risk phase)
  play/page.tsx                Game page, gated by NEXT_PUBLIC_GAME_LIVE
  admin/crop/page.tsx          Token-gated content tooling
  api/
    puzzle/today/route.ts      Today's puzzle WITHOUT the answer
    guess/route.ts             Server-side guess check (the trust boundary)
    crop/[date]/[index]/route.ts   Token-gated crop image server
    catalog/route.ts           Full-catalog autocomplete index
    waitlist/route.ts          Email capture
    admin/route.ts             addWatch / schedule (token-gated)
    og/route.tsx               Spoiler-free share-card PNG
  go/[ref]/route.ts            Tracked affiliate redirect
components/
  Game.tsx                     The whole client game (state machine + UI)
  WaitlistForm.tsx             Landing email form
  AdminClient.tsx              Admin forms
db/
  schema.ts                    Drizzle tables
  index.ts                     Dual-driver client + getDb()
lib/
  daily.ts                     Day key, reset offset, MAX_CROPS, countdown
  sign.ts                      HMAC crop-token signing (anti-cheat)
  normalize.ts                 Guess normalization + alias matching
  scoring.ts                   Medals + Horology Score
  share.ts                     Spoiler-free share string
  game.ts                      Server-only DB queries
  reveal.ts                    Builds the reveal payload (the "store")
  cropImage.ts                 DEMO placeholder art (SVG)
  seed-data.ts                 Demo catalog + seed function
  bootstrap.ts                 Server-startup warmup
instrumentation.ts             Runs bootstrap once on server start
scripts/
  seed.ts                      CLI seed (real Postgres)
  cut.ts                       PRODUCTION crop pipeline (master -> 6 crops)
```

## The trust boundary (anti-cheat)

This is the single most important design rule. **The answer is never sent to the browser until the player solves or exhausts all six crops.**

- [app/api/puzzle/today/route.ts](../app/api/puzzle/today/route.ts) returns only the puzzle number, `maxCrops`, and the **crop-0 image URL**. No brand, model, reference, or future crop.
- Each guess POSTs `{cropIndex, brand, model}` to [app/api/guess/route.ts](../app/api/guess/route.ts), which loads today's answer **server-side**, compares, and returns only `{brandCorrect, modelCorrect, solved}` plus — on a miss — the **next** crop URL, or — on solve/exhaust — the full reveal.
- Crop images are gated by an **HMAC token**: [lib/sign.ts](../lib/sign.ts) signs `${date}:${cropIndex}` with `GUESS_SECRET`. [app/api/crop/[date]/[index]/route.ts](../app/api/crop/%5Bdate%5D/%5Bindex%5D/route.ts) refuses any crop without a valid token. The client gets the crop-0 token from `puzzle/today` and a token for the **next** crop only when it earns one from `/api/guess`. So you cannot enumerate future crops of today's watch.
- The autocomplete index ([app/api/catalog/route.ts](../app/api/catalog/route.ts)) returns the **entire** catalog's brands/models. Returning everything leaks nothing about *today's* answer, and lets Fuse.js run locally with zero per-keystroke server calls.

> **Known limitation (acceptable for MVP):** a determined user can POST `final:true` to force the reveal early — but that only spoils their *own* game. There's no per-user server state without accounts. See [RISKS.md](RISKS.md#security--abuse).

## Request flow: one round

1. `GET /api/puzzle/today` → `{puzzleNumber, maxCrops, firstCropUrl}`.
2. Client renders crop 0 (fetched with its token).
3. Player types a **brand** → `POST /api/guess {cropIndex:0, brand}`.
   - Correct → client unlocks the **model** input (stays on same crop).
   - Wrong → server returns the next crop; client zooms out.
4. Player types a **model** → `POST /api/guess {cropIndex, brand, model}`.
   - Solved → server returns the **reveal** (brand/model/specs/full image/affiliate link).
   - Brand-right/model-wrong → client grants one **free retry** (the "partial grace"), then advances.
5. On solve or exhaust, [components/Game.tsx](../components/Game.tsx) renders the reveal, updates streak/stats in `localStorage`, and builds the spoiler-free share string ([lib/share.ts](../lib/share.ts)).

The full state machine (brand/model stages, partial grace, skip, give-up) lives in `submit()` / `skip()` / `giveUp()` in [components/Game.tsx](../components/Game.tsx).

## Data model

See [db/schema.ts](../db/schema.ts). Six tables:

- **`watches`** — the catalog. Note `cropSpecs` (the 6 crop rectangles), `distinctiveDesign` (trade-dress watchlist), and the **provenance columns** (`photoSource`, `photoLicense`, `attribution`).
- **`puzzles`** — the daily schedule: one row per `puzzleDate` (unique), with a `puzzleNumber` and a `watchId`.
- **`aliases`** — `alias → canonical` for brands and models (e.g. `ap → audemars piguet`, `sub → submariner`), stored already-normalized.
- **`guessesLog`** — anonymous guess log for difficulty tuning + the "X solved today" counter.
- **`waitlist`** — the durable asset: captured emails.
- **`affiliateClicks`** — tracked clicks so you measure your **own** EPC, not the affiliate dashboard's lossy attribution.

## Daily selection

No cron is needed to *pick* the puzzle. [lib/daily.ts](../lib/daily.ts) computes `todayKey()` (a `YYYY-MM-DD` string with a configurable `RESET_OFFSET_HOURS`, default −5, which rolls over at 05:00 UTC: midnight US Eastern, breakfast in Europe), and [lib/game.ts](../lib/game.ts) simply queries `puzzles where puzzleDate = todayKey()`. A cron job is only useful later for side-effects (snapshot stats, push notifications, cache warming).

## Dual database (`getDb()`)

[db/index.ts](../db/index.ts) picks a driver from `DATABASE_URL`:

- **Real Postgres (Neon)** when `DATABASE_URL` is a `postgres://` URL — for production.
- **In-process PGlite (WASM)** otherwise — for the zero-setup local demo. It **self-bootstraps**: on first `getDb()` it applies the generated schema DDL from `drizzle/*.sql` and seeds the catalog from [lib/seed-data.ts](../lib/seed-data.ts).

**Always access the DB via `await getDb()`** (never a bare client) so PGlite bootstrap completes before any query runs. This is why every route/query is `async` and awaits `getDb()`.

> PGlite is a **demo convenience only**. It's in-memory and per-process — fine for one local player, wrong for production. See [RISKS.md](RISKS.md#production-gaps).

## Images: demo vs production

- **Demo (now):** [lib/cropImage.ts](../lib/cropImage.ts) generates a stylized SVG watch that zooms out by crop index. Zero real photos → zero rights exposure → the loop runs immediately.
- **Production:** [scripts/cut.ts](../scripts/cut.ts) cuts the 6 crops from a master photo you own (using `sharp` + the `cropSpecs` rectangles), to be stored on Vercel Blob. You then change the crop route to serve those files instead of the SVG. The token gating stays identical. **A human must QA that no logo survived before the watch is scheduled.**
