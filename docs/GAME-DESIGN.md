# Game design

The mechanics, and the reasoning behind each choice. This is the spec the code in [components/Game.tsx](../components/Game.tsx), [lib/scoring.ts](../lib/scoring.ts), and [lib/share.ts](../lib/share.ts) implements.

## Core loop

> One global watch per day. Start at an extreme macro crop (logo hidden). Guess the brand, then the model. Miss → zoom out one step. Six crops total.

**Why a single daily watch?** It's the synchronized water-cooler moment that made Wordle spread — everyone discussing the same puzzle. Unlimited play dilutes that, so endless/archive mode is a *separate, paid* surface, never the main loop.

## The six crops

Defined per-watch as `cropSpecs` (6 rectangles + blur) in [db/schema.ts](../db/schema.ts):

1. Extreme macro of a signature detail (crown, handset, single index, bezel texture, movement bridge) — expert-only.
2. Wider ambiguous detail (sub-dial, lug, clasp).
3. Dial quadrant, text masked.
4. Full dial, logo blurred.
5. Full case + dial silhouette.
6. Whole watch, neutral background, still logo-masked.

The "aha" of recognizing a watch from a tiny detail is the fun. Experts feel like geniuses on crop 1; casuals still get the silhouette by crop 5.

## Two-stage guessing (brand → model)

Implemented in `submit()` in [components/Game.tsx](../components/Game.tsx):

- **Stage 1 — brand.** Free text with fuzzy autocomplete ([Fuse.js](../components/Game.tsx)). Aliases resolve `AP → Audemars Piguet`, etc. via [lib/normalize.ts](../lib/normalize.ts).
- **Stage 2 — model family.** Unlocked once the brand is right; autocomplete scoped to that brand.
- **Win = brand + model family.** This *depth* is the differentiator — existing watch-guess games stop at brand only.

**Partial grace:** a brand-right / model-wrong guess freezes the brand as solved and grants **one** free model retry at the same crop before advancing. This protects win-rate (target ~85–90%) so the game isn't punishing.

## Scoring — two axes

[lib/scoring.ts](../lib/scoring.ts):

1. **Binary (the Wordle hook):** solved or not, and on which crop. Drives the **medal** — gold (crop 1–2), silver (3–4), bronze (5–6).
2. **Horology Score (the depth hook):** `(MAX_CROPS − cropIndex) × difficultyWeight × 10`, plus a reference bonus, minus hint/retry penalties. Because `difficultyWeight` is intrinsic to the watch, **nailing an obscure grail early scores far more than an easy Submariner.** This is the second competitive axis casual clones lack, and it keeps experts engaged after the daily becomes easy.

## Difficulty mix (curation, not a setting)

Aim for roughly: **70%** winnable by a moderate enthusiast by crop 4–5, **20%** mainstream icons (good for new-player share virality), **10%** deep-cut grails for experts. This is an editorial decision made when scheduling, not a player-selected mode. `difficultyWeight` (1–5) on each watch encodes it.

## Retention & virality

- **Share card — the #1 growth feature** ([lib/share.ts](../lib/share.ts)). Spoiler-free: a row of six squares, a medal square on the solve crop, never the watch name. Looks like `WatchCrop #142 — 3/6 🥈 · streak 24`. The visual grid is what made Wordle spread. **It must never embed the answer** — that's a code-review invariant.
- **Streaks + stats** (currently `localStorage` in [components/Game.tsx](../components/Game.tsx)): current/max streak, win %, surfaced prominently to trigger loss-aversion.
- **Countdown + "X solved today"** on the reveal — social proof + a return cue.
- **Reset timing** ([lib/daily.ts](../lib/daily.ts) `RESET_OFFSET_HOURS`): anchor the rollover to a morning for your core audience so the habit stacks onto coffee. One-line config; decide before launch.

## Modes (post-launch)

Layer these only after the daily ships: Practice/Archive (paid), Movement-only Hardcore, Themed Weeks (Dive / Chrono / Vintage / Microbrand — also native sponsorship inventory), async Head-to-Head ("challenge a friend" — the active invite vector beyond passive share pasting).

## Naming

Avoid the crowded `watchle`/`watchdle` namespace, put **no watch brand** in your name, and **don't clone Wordle's exact name/grid/colors** (NYT ran a DMCA campaign against clones in 2024). `WatchCrop` and `CrownGuess` are safe-sounding starting points — do a trademark search before committing. See [RISKS.md](RISKS.md#trademark--branding).
