# WatchCrop

A daily "guess the watch" game. We start zoomed all the way in — a crown, a handset, a movement bridge — logos hidden, and zoom out each time you miss. Name the brand + model before it's fully revealed; the reveal screen is the store.

This repo is built to ship in **two phases from one codebase**:

1. **De-risk phase (now):** the public sees only a **waitlist landing page** (`/`) plus a tracked **affiliate-redirect** endpoint (`/go/[ref]`) so you can validate demand and real EPC *before* committing to the content treadmill. `NEXT_PUBLIC_GAME_LIVE=false`.
2. **Game phase (after demand is proven):** flip `NEXT_PUBLIC_GAME_LIVE=true` and the daily game at `/play` goes live.

> **Why this split?** The design review flagged two *fatal-if-wrong* risks — copyright in the photos and the daily content treadmill — and one ceiling risk (audience size). All three are cheapest to test with a landing page + a manual daily, for ~$0, before you build a photo library. See **De-risk playbook** below.

## 📚 Docs

In-depth guides live in [docs/](docs/):

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — code structure, request flows, data model, the anti-cheat design, dual database.
- [docs/GAME-DESIGN.md](docs/GAME-DESIGN.md) — mechanics, scoring, retention, and the reasoning behind each choice.
- [docs/RISKS.md](docs/RISKS.md) — **read before scaling**: fatal risks, legal cautions, security & production gaps.
- [docs/ROADMAP.md](docs/ROADMAP.md) — what's done, the de-risk gate, and the path to launch.
- [docs/IDEAS.md](docs/IDEAS.md) — monetization sequencing, growth experiments, vertical expansion.

## Stack

- **Next.js 16** (App Router) on **Vercel**
- **Neon Postgres** + **Drizzle ORM**
- **Tailwind v4**
- **Fuse.js** client-side autocomplete
- **sharp** for the production crop pipeline

## Setup

```bash
cp .env.example .env        # fill in DATABASE_URL, GUESS_SECRET, ADMIN_TOKEN
npm install
npm run db:push             # create tables in your Neon db
npm run seed                # demo catalog + a week of scheduled puzzles (refuses a non-empty db; --force wipes it)
npm run dev
```

- Landing / waitlist: http://localhost:3000
- Game (set `NEXT_PUBLIC_GAME_LIVE=true` first): http://localhost:3000/play
- Admin (content): http://localhost:3000/admin/crop?token=YOUR_ADMIN_TOKEN

`openssl rand -hex 32` makes a good `GUESS_SECRET` / `ADMIN_TOKEN`.

## How it fits together

| Path | What it does |
| --- | --- |
| `/` | Waitlist landing (de-risk). Switches to a "Play" CTA when the game is live. |
| `/play` | The daily game (client component `components/Game.tsx`). |
| `/admin/crop` | Token-gated tool to add watches + schedule puzzles. |
| `GET /api/puzzle/today` | Today's puzzle **without the answer** — only the crop-0 URL. |
| `POST /api/guess` | Server-side check. Returns `{correct}` + the **next** signed crop, or the reveal on solve/exhaust. |
| `GET /api/crop/[date]/[index]` | Serves a crop **only with a valid HMAC token**. Demo art today; swap to Blob in prod. |
| `GET /api/catalog` | Full-catalog autocomplete index (leaks nothing about today). |
| `GET /go/[ref]` | Tracked affiliate redirect — logs the click to **your** table for honest EPC. |
| `POST /api/waitlist` | Email capture — the durable asset. |
| `GET /api/og` | Spoiler-free share-card PNG. |

### Anti-cheat (the load-bearing rule)

The answer (brand/model/reference/full image/affiliate link) is **never serialized into the page or any API response** until you solve or exhaust all 6 crops. Each guess POSTs to the server, which checks the answer server-side and returns only `{correct}` plus an opaque, HMAC-signed URL for the next crop. Future crops of today's watch are unreachable without earning the token (`lib/sign.ts`).

## The image problem (read before scaling)

Copyright lives in the **photograph**, owned by whoever took it — not the brand, not the watch owner. **Cropping and hiding the logo do NOT cure copyright infringement.** A daily game that grabs web images manufactures one fresh, willful infringement per day.

The only safe backbone is **shoot your own** (`photoSource: "own"` — you own the copyright the instant the shutter fires). The scheduler **refuses any watch that fails the provenance gate** ([lib/provenance.ts](lib/provenance.ts)): no recorded photo source, a community photo, a licensed photo without its license, CC BY without attribution, a protected design not shot by you, or crops nobody has signed off for surviving logos. Fill the catalog by borrowing watches from local ADs / microbrands / collectors in exchange for the affiliate link + a reveal credit. License only the *metadata* (specs), never wire stock/marketplace/press-kit images into puzzles. Community submissions are **lead-gen** (which watch to shoot), not a content source.

The demo art (`lib/cropImage.ts`) is generated SVG — zero real photos, zero rights exposure — so you can run and demo the whole loop today. `scripts/cut.ts` is the production path: cut 6 crops from your own master with `sharp` into `./crops` (never `public/`, which would serve crop 6 to anyone), **human-QA that no logo survived** and sign it off in `/admin/crop`, then serve them from Blob.

## De-risk playbook (do this before the content treadmill)

1. **Image-source gut check.** For your first ~90 target watches, write down where each photo would actually come from. If >30% isn't "I'll shoot it" or "paid/verified CC-BY", stop — the pipeline is broken.
2. **Incumbent autopsy.** Check the existing watch-guess games' traffic + count real daily share-grid pastes. Are they growing or stalled?
3. **Manual daily.** Run a "guess the watch" post by hand in r/Watches / WatchCrunch / WatchUSeek for ~2 weeks. Measure unique daily players + organic reshares.
4. **Fake-door waitlist.** This landing page. Tag every link you post (`/?utm_source=reddit&utm_campaign=r-watches-0611`); the **Demand** panel at the top of `/admin/crop` shows visits, signups and conversion by source and by day, and exports the list as CSV. Visits are counted once per browser session with no personal data; signups go through a honeypot, a minimum-fill-time check, a per-network rate limit and Vercel BotID, so scripted junk doesn't inflate the number (BotID-flagged signups are kept in the CSV as `flagged_bot` but left out of the counts).
5. **Affiliate EPC test.** Apply to programs, run a few manual "answer → buy" posts through `/go/[ref]`, and measure real EPC over 30–45 days. (Note: Chrono24 has **no** affiliate program — the reveal falls back to a non-monetized market link for those.)

**Gate:** don't flip `NEXT_PUBLIC_GAME_LIVE=true` / build the photo library until the manual daily + waitlist show a credible path past ~1k DAU.

## Deploy (Vercel)

Production **requires** a real database: with no `DATABASE_URL` the app refuses to start its in-memory demo db on `VERCEL_ENV=production` (it would silently drop every waitlist signup on each cold start). Preview deployments fall back to the self-seeding PGlite demo, so PR previews are playable without touching prod data.

```bash
vercel link

# Production: a real Neon database (sets DATABASE_URL on production only) + secrets.
vercel integration add neon --name watchcrop -e production --no-env-pull
vercel env add GUESS_SECRET -e production --value "$(openssl rand -hex 32)"
vercel env add ADMIN_TOKEN -e production --value "$(openssl rand -hex 32)"
vercel env add NEXT_PUBLIC_SITE_NAME -e production --value WatchCrop
vercel env add NEXT_PUBLIC_GAME_LIVE -e production --value false
vercel env add NEXT_PUBLIC_CONTACT_EMAIL -e production --value you@your-address   # shown on /privacy
vercel env run -e production -- npm run db:migrate    # create the tables in Neon

# Previews: no DATABASE_URL (PGlite demo), their own secrets, game switched on for review.
vercel env add GUESS_SECRET -e preview --yes --value "$(openssl rand -hex 32)"
vercel env add ADMIN_TOKEN -e preview --yes --value "$(openssl rand -hex 32)"
vercel env add NEXT_PUBLIC_GAME_LIVE -e preview --yes --value true

vercel --prod
```

Don't pull the production `DATABASE_URL` into `.env.local`: local dev (and the destructive `npm run seed`) would then run against prod.

## Known TODO / fast-follows

- Drag-to-crop authoring UI in `/admin` (today: define `cropSpecs` JSON + `scripts/cut.ts`).
- Swap the demo SVG crop route for Blob-served real crops once you have masters.
- Accounts (cross-device streaks), archive/practice mode (paid), exact-reference guessing, head-to-head.
- FTC: have the reveal-screen affiliate disclosure + any sponsored-puzzle labeling reviewed before turning on money.
