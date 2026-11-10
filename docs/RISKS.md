# Risks & cautions

**Read this before you scale.** The code is the easy part. Two of these risks are *fatal-if-wrong*, and the current scaffold has several demo→production gaps you must close before real users or real money.

---

## 🛑 Fatal risk 1 — photo copyright

**Copyright lives in the *photograph*, owned by whoever pressed the shutter** — not the brand, not the watch's owner. **Cropping and hiding the logo do NOT cure copyright infringement.** A daily game that grabs a "good photo of today's watch" off the web manufactures *one fresh, willful, independently-actionable infringement per day* (statutory damages up to $150k/work) against photographers, stock agencies, and marketplaces — some of whom litigate as a business model.

**This is the whole-business risk, and "logos hidden" actively masks it** (a reverse-image search tuned to avoid false positives misses your renamed crop, so you won't get caught until you're big enough to be worth suing).

**What's safe:**
- **Shoot your own** (`photoSource: "own"`). You own the copyright the instant the shutter fires. This is the backbone — target ~70%+.
- **Paid commercial license** or **CC BY / CC0 only** (never CC BY-SA — share-alike turns your cropped puzzle into something competitors can lift). Note: stock photos of *branded* watches are frequently **editorial-use-only**, so this tier is thinner than it looks.

**What to avoid, flatly:** brand press kits (editorial-only), marketplace listings (eBay/Chrono24 — owned by sellers), Google Images, "free" stock that's actually editorial-tier.

**The guardrail in code:** [app/api/admin/route.ts](../app/api/admin/route.ts) **refuses to schedule any watch missing `photoSource`** (the "provenance gate"). Don't remove it. Keep a per-image provenance record (`photoSource`, `photoLicense`, `attribution` columns already exist in [db/schema.ts](../db/schema.ts)).

**Cheap validation (do before building a library):** for your first ~90 target watches, write down where each photo would actually come from. If >30% isn't "I'll shoot it" or "paid/verified CC-BY", the pipeline is broken.

---

## 🛑 Fatal risk 2 — the content treadmill

This is a tiny daily **editorial business** wearing a software costume. The bottleneck is rights-clean photos of *identifiable, branded* watches — and the grails that give the game depth are exactly the ones you can't physically borrow to shoot. A **mislabeled reference** in front of r/Watches pedants is a screenshot-able credibility event.

**Mitigations:**
- Build a **180-day puzzle buffer** *before* launch and track it as a solvency metric with a hard restock trigger.
- Batch-capture via "borrow your watches for photos" deals with local ADs / microbrands / collectors (trade: affiliate link + reveal credit + sponsored-round priority).
- One master photo → all 6 crops ([scripts/cut.ts](../scripts/cut.ts)).
- A named **"no publish without a verified reference"** QA gate.
- An evergreen safe-puzzle fallback pool so a bad photo week can never break the daily cadence.

**Cheap validation:** time-box producing one full puzzle end-to-end (logo removal + trade-dress check + 6 crops + label + affiliate link + blurb). If it's >30 min of skilled work, multiply by 30/month and confront the burden.

---

## ⚠️ Ceiling risk — audience size

Demand for the *activity* (people play "guess the watch" by hand daily) is proven; demand for a standing daily *game at scale* is not. The watch share-grid only recruits from people who can name watches — a far smaller, self-selected pool than Wordle's universal vocabulary. Existing watch-guess games appear stalled.

**Plan to the bottom of the band:** treat **1k–5k DAU (a lifestyle outcome)** as the base case, not 50k. Make the **email list** the primary durable asset. Keep MVP scope hobby-sized. The catalog-driven architecture **generalizes** (cars, sneakers, cameras) if watch-only proves too thin — see [IDEAS.md](IDEAS.md#vertical-expansion).

---

## Legal cautions

### Trademark & trade dress
- **Hiding logos + naming the brand only as the answer** (nominative fair use) + a persistent "not affiliated / not endorsed" disclaimer (already on [app/page.tsx](../app/page.tsx)) neutralizes most trademark exposure.
- **Your own product/app name must contain no watch trademark** — post-*Jack Daniel's* (2023) you can't hide behind expressive-use if the mark is your source identifier.
- **Trade dress** is the sharp edge: a few designs are protected *independent of the logo* — AP Royal Oak (octagonal bezel + 8 hex screws), Rolex fluted bezel/Cyclops, Cartier Tank/Santos, Nautilus, G-Shock square. Your **extreme-macro crop is the worst case** because it isolates the protected signature with the logo removed. The `distinctiveDesign` flag in [db/schema.ts](../db/schema.ts) is your watchlist — for these, use own-photos only and don't crop to isolate the protected feature. Get one hour of IP counsel on an actual AP/Rolex crop-1 before launch.

### Wordle clone
NYT actively DMCA's clones of Wordle's **name, exact 5×6 grid, and green/yellow colors**. Don't copy them. See [GAME-DESIGN.md](GAME-DESIGN.md#naming).

### FTC
Affiliate links require **clear disclosure**; sponsored puzzles require **"sponsored/ad" labeling**. The reveal screen already carries a small "may be affiliate links" line ([components/Game.tsx](../components/Game.tsx)) — have the exact copy reviewed before turning on money.

---

## Security & abuse

Current scaffold (fix before/at launch):

- **No rate limiting on `/api/guess`.** A scraper could brute-force the catalog to map crop→answer. Add Upstash Redis rate limiting (also powers the live "X solved today" counter). Tracked in [ROADMAP.md](ROADMAP.md).
- **Client can force the reveal early** by POSTing `kind: "giveUp"`, and clearing storage restarts the day at crop 1 — but both only spoil *their own* game (no per-user server state without accounts). Acceptable for MVP. Crops themselves unlock strictly in order: `/api/guess` demands the token of the crop being acted on.
- **Admin token is passed in the URL query** (`/admin/crop?token=…`) and as a header for the API. Fine for a solo operator over HTTPS, but it can leak via browser history / referer logs. Move to a proper auth/session before adding any collaborator.
- **Demo secrets** in [.env](../.env) (`GUESS_SECRET`, `ADMIN_TOKEN`) are weak placeholders. Generate real ones (`openssl rand -hex 32`) for any deployment — and never commit `.env`.

---

## Production gaps in the current scaffold

These are intentional shortcuts for a runnable demo. Close them before production:

| Area | Demo state | Production need |
| --- | --- | --- |
| Database | In-process **PGlite** (in-memory, per-process, re-seeds on restart) | Real **Neon Postgres** via `DATABASE_URL` (the code already switches automatically) |
| Images | Generated SVG art ([lib/cropImage.ts](../lib/cropImage.ts)) | Your own photos, cut by [scripts/cut.ts](../scripts/cut.ts), served from Vercel Blob; update the crop route to serve them |
| Stats / streaks | `localStorage` only (per-device) | Accounts for cross-device streaks (optional; weigh against the no-login casual funnel) |
| "Solved today" counter | Reads from one process's DB | Shared store (Postgres is fine; Redis is faster) |
| Monetization | Affiliate link + market link | Real affiliate IDs, sponsored-puzzle inventory, FTC-reviewed copy |
| Revenue model | — | **Affiliate is overstated ~5–10×.** Trivia clicks are low-intent (~0.1–0.5% conversion), cookies are short, and **Chrono24 has no affiliate program** (model it as zero). Treat **sponsorship + the email list** as the engine, affiliate as a tail. |
