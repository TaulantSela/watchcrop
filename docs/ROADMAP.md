# Roadmap

What's done, what's next, and the order to do it in. The guiding principle: **validate demand before paying the content-treadmill cost** (see [RISKS.md](RISKS.md)).

## ✅ Done (this scaffold)

- Full game loop: progressive crops, two-stage brand→model guessing, autocomplete, partial-grace, scoring/medals, win/lose reveal, spoiler-free share card, streaks/stats.
- Server-side anti-cheat: answer never leaks client-side; HMAC-gated crop images ([lib/sign.ts](../lib/sign.ts)).
- De-risk surfaces: waitlist capture ([app/api/waitlist/route.ts](../app/api/waitlist/route.ts)) + tracked affiliate redirect ([app/go/[ref]/route.ts](../app/go/%5Bref%5D/route.ts)).
- Content tooling: add-watch + schedule-puzzle admin, with the photo-provenance gate.
- Dual database (PGlite demo / Neon prod) that self-bootstraps.
- Verified: `tsc`, `next build`, and a full endpoint smoke test all pass.

## ▶️ Phase 0 — De-risk (before writing more product code)

These cost ~$0 and gate everything. Don't build the photo library until they pass.

1. **Image-source gut check** — for ~90 target watches, confirm >70% can be self-shot or properly licensed. ([RISKS.md](RISKS.md#-fatal-risk-1--photo-copyright))
2. **Incumbent autopsy** — check existing watch-guess games' traffic + count real daily share-grid pastes. Growing or stalled?
3. **Manual daily** — run a hand-curated "guess the watch" post in r/Watches / WatchCrunch / WatchUSeek for ~2 weeks. Measure unique daily players + organic reshares.
4. **Fake-door waitlist** — keep `NEXT_PUBLIC_GAME_LIVE=false`, ship the landing, tag posted links with `utm_source`, and read signup rate + source off the Demand panel in `/admin/crop`.
5. **Affiliate EPC test** — apply to programs, run a few manual "answer → buy" posts through `/go/[ref]`, measure real EPC over 30–45 days.

**Gate:** only proceed to Phase 1 if the manual daily + waitlist show a credible path past ~1k DAU.

## ▶️ Phase 1 — Real foundation

- **Wire Neon Postgres** — create a free project, set `DATABASE_URL` in `.env`, run `npm run db:push && npm run seed`. The code switches drivers automatically; waitlist/stats now persist.
- **Shoot the masters.** The pipeline is built: upload in `/admin/crop`, set crops + logo masks, re-cut, sign off. **Human-QA every crop for surviving logos.**
- **Build the 180-day puzzle buffer** and track it.
- **Lock the name** — trademark search, no watch brand, not a Wordle clone.

## ▶️ Phase 2 — Launch & distribute

- Flip `NEXT_PUBLIC_GAME_LIVE=true`.
- Submit to Listdle and every "dle" aggregator (incumbents are absent there).
- Seed the three communities by partnering with the volunteers already running guess-the-watch threads.
- Wire the OG share image ([app/api/og/route.tsx](../app/api/og/route.tsx)) onto share URLs for rich social previews.
- Turn on the affiliate reveal CTA + email capture on reveal (Phase 1 of the monetization sequence in [IDEAS.md](IDEAS.md)).

## ▶️ Phase 3 — Monetize & deepen

- Sponsored puzzles (microbrands), capped at ~1/week.
- "Connoisseur" membership: archive/practice mode, deep stats, hard modes.
- Exact-reference guessing (connoisseur layer + ⭐ on the share card).

## Fast-follows / deferred features

- **Drag-to-crop authoring UI** in `/admin` (today: rectangle JSON with a live overlay on the photo).
- **Accounts** for cross-device streaks (weigh against the no-login casual funnel).
- **Themed Weeks** / **Movement-only Hardcore** mode.
- **Head-to-head** async challenge-a-friend.
- **Streak freeze** (Duolingo-style) to soften churn.
- **Analytics** on guess distribution per watch → retune `difficultyWeight`.
- **Cron** ([Vercel Cron]) for stats snapshots / push / cache warming (selection needs no cron).

## Suggested 30 / 60 / 90

- **0–30:** Phase 0 validations. Start shooting watches in parallel. **Gate** before building.
- **31–60:** Phase 1 foundation + reach the 180-day buffer. Soft-launch to one community with zero monetization; measure share coefficient + D1/D7.
- **61–90:** Phase 2 distribution + turn on the affiliate CTA → first affiliate dollar. Pitch 5 microbrands the sponsored-puzzle slot. **Kill/continue gate:** ~1k DAU + positive share coefficient by day 90, or pivot the vertical / treat as a portfolio piece.
