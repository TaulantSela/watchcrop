/**
 * Normalizes a brand/model string for comparison: lowercase, strip accents,
 * collapse punctuation and whitespace. Used on BOTH the guess and the answer
 * so "Audemars-Piguet " and "audemars piguet" compare equal.
 */
export function normalize(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A guess matches the answer if normalized-equal or if an alias resolves to it. */
export function matchesAnswer(
  guess: string,
  answer: string,
  aliasMap: Map<string, string>,
): boolean {
  const g = normalize(guess);
  if (!g) return false;
  const a = normalize(answer);
  if (g === a) return true;
  // Resolve the guess through known aliases (alias -> canonical, both normalized).
  const resolved = aliasMap.get(g);
  return resolved === a;
}
