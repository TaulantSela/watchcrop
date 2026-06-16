# Ideas

Monetization sequencing, growth experiments, and where this can go. Opinionated, not exhaustive.

## Monetization — the order matters

**Core principle: the reveal screen is the business; the free game is your customer-acquisition cost.** Keep the puzzle, autocomplete, streaks, and share card free and ad-free forever. Turn revenue on in this order so you never wreck the habit:

- **Phase 0 (launch → ~1k DAU): nothing.** Just the free game, the share loop, and **email capture on the reveal**. Staying non-commercial early also keeps your fair-use posture clean while you build the owned photo library.
- **Phase 1 (~1k–5k DAU):** the daily affiliate **"Shop this reference"** CTA + email capture. Pure upside, zero UX cost.
- **Phase 2 (~5k+ DAU):** **sponsored puzzles** — start 1/week, pitched to microbrands you already affiliate. Cap at ~4/month; scarcity protects both the ritual and the price. **This is the actual engine.**
- **Phase 3 (loyal base):** **"Connoisseur" membership** (~$49/yr) — archive/practice, deep stats, movement-only mode, exact-reference scoring, no ads. Enthusiast price, not a $0.99 casual price.
- **Phase 4 (last):** opt-in **rewarded video** for an extra hint (high eCPM on this audience). Never interstitials, never forced.

**Affiliate priority:** direct microbrand/dealer programs (10–20%) > broad dealer/Amazon (4–10%) > grail/vintage with no program → a non-monetized "see market price" link. **Chrono24 has no affiliate program** — the 6.5% you'll see quoted is its *seller* fee; model it as zero.

**Be honest about the numbers:** affiliate on infrequent, high-consideration purchases with short cookies is a **tail line, not the P&L**. The durable assets are **sponsorship revenue** and the **email list**. (Full reasoning in [RISKS.md](RISKS.md#production-gaps).)

## Growth experiments

- **Share card is the growth engine** — A/B the header format, the medal emoji, and whether to include the streak. The grid spreads; SEO content doesn't (AI Overviews gutted affiliate-content sites). Win via **community-native** distribution.
- **#watchtok clips** mirroring the in-app reveal ("guess the brand in 5 zooms").
- **Partner, don't compete, with the people already running guess-the-watch threads** — offer them a co-branded weekly puzzle.
- **Themed Weeks as sponsorship inventory** — "Dive Week brought to you by <microbrand>" is native, non-intrusive, and sellable.
- **Streak mechanics** — prominent streak, pre-break warning, optional streak freeze (loss-aversion is the strongest retention lever).
- **Head-to-head challenge-a-friend** — the only *active* invite vector; passive share-pasting has a low coefficient.

## Feature ideas

- **Exact-reference connoisseur layer** — after solving, optionally guess the exact ref (multiple-choice among close refs at MVP) for a big Horology Score bonus + a ⭐ on the share card. Free-text refs are too punishing/inconsistent at first.
- **"Movement Monday"** and other recurring themes for texture and a reason to return on specific days.
- **Personal stats deep-dive** (paid) — your accuracy by brand, by decade, by complication.
- **Leaderboards** scoped to a community/friends rather than global (global is demoralizing and gameable).
- **A "too easy/too hard" one-tap signal** on the reveal → feeds `difficultyWeight` retuning.

## Vertical expansion

The architecture is **catalog-driven** — a `watches` table, `cropSpecs`, a daily schedule, alias matching, the anti-cheat token flow. **None of it is watch-specific.** If watches prove too thin (the ceiling risk in [RISKS.md](RISKS.md#-ceiling-risk--audience-size)), the same engine runs:

- **Cars** (guess the car from a detail — huge audience, strong affiliate via parts/marketplaces),
- **Sneakers** (massive Gen-Z resale culture, StockX-style affiliate),
- **Cameras / lenses, guitars, mechanical keyboards, F1 liveries…**

Build it watch-first, but keep the catalog abstraction clean so a second vertical is a content project, not a rewrite. A **multi-vertical "guess the [thing]" network** sharing one share-card brand is a bigger swing than watches alone.

## Things explicitly NOT worth doing (from the analysis)

- An SEO content/affiliate site — being gutted by AI Overviews.
- A "trusted provenance/authentication" play — the trust belongs to brands/authenticators, not an app; owner-minted records are self-attestation.
- Betting on affiliate volume as the primary revenue — it's a tail. Sponsorship + email is the business.
- Modeling any revenue on a Chrono24 affiliate program — it doesn't exist.
