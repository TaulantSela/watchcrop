/**
 * User agents that shouldn't count as people: crawlers, link-preview fetchers
 * and scripts. Used to keep visit and affiliate-click numbers honest.
 */
export const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|curl|wget|python/i;

export function isBot(userAgent: string | null): boolean {
  return BOT_UA.test(userAgent ?? "");
}
