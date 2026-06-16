# WatchCrop docs

Start here. These docs explain how the project works, what's real vs. demo, and what to do next.

| Doc | What it covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the code is structured, request flows, the data model, the anti-cheat design, and the dual-database setup. |
| [GAME-DESIGN.md](GAME-DESIGN.md) | The game mechanics, scoring, retention loop, and *why* each decision was made. |
| [RISKS.md](RISKS.md) | **Read before scaling.** The fatal risks (photo copyright, content treadmill), legal cautions (trademark / trade dress / FTC), and the demo→production gaps in the current scaffold. |
| [ROADMAP.md](ROADMAP.md) | What's done, what's next, the de-risk gate, and the path from scaffold → launch. |
| [IDEAS.md](IDEAS.md) | Monetization sequencing, growth experiments, and expansion ideas. |

The top-level [../README.md](../README.md) has setup + run instructions.

## TL;DR

- It's a **daily "guess the watch" game**: an extreme macro crop (logo hidden) zooms out each miss; you guess **brand → model**; the reveal screen is the store (affiliate link).
- Built as **two phases from one codebase**, gated by `NEXT_PUBLIC_GAME_LIVE`: a **waitlist landing** (de-risk now) and the **`/play` game** (after demand is proven).
- The hard part is **not** the code — it's **owning the photos** and **feeding the daily puzzle**. The architecture has guardrails for both (a provenance gate, a content buffer plan), but they only work if you respect them. See [RISKS.md](RISKS.md).
- The current crops are **generated placeholder art** ([../lib/cropImage.ts](../lib/cropImage.ts)) so the whole loop runs with zero real photos. Swapping in real photos is a deliberate, gated step.
