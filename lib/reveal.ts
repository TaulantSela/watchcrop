import "server-only";
import { MAX_CROPS, secondsUntilNext } from "./daily";
import { solvedToday } from "./game";
import { cropUrl } from "./sign";
import type { watches } from "@/db/schema";

export type Reveal = Awaited<ReturnType<typeof buildReveal>>;

/** The reveal screen IS the store. Built server-side only on solve / exhaust. */
export async function buildReveal(date: string, watch: typeof watches.$inferSelect) {
  const query = [watch.brand, watch.model, watch.reference].filter(Boolean).join(" ");
  return {
    brand: watch.brand,
    model: watch.model,
    reference: watch.reference,
    year: watch.year,
    movement: watch.movement,
    specBullets: watch.specBullets ?? [],
    fullImageUrl: cropUrl(date, MAX_CROPS - 1),
    // Affiliate "Shop this reference" CTA — null when there's no affiliate path
    // (grail/vintage), where we fall back to a non-monetized market link.
    shopUrl: watch.affiliateRef ? `/go/${watch.affiliateRef}` : null,
    marketUrl: `https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(query)}`,
    solvedToday: await solvedToday(date),
    secondsUntilNext: secondsUntilNext(),
  };
}
