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

/**
 * If `text` starts with a name for `brand` (the brand itself or one of its
 * aliases), returns what follows it; otherwise null. The longest matching
 * prefix wins, and only whole words count, so "Grand Seiko SBGA211" is NOT a
 * Seiko and "Rolex Submariner" yields "submariner".
 */
export function afterBrand(
  text: string,
  brand: string,
  brandAliases: Map<string, string>,
): string | null {
  const words = normalize(text).split(" ").filter(Boolean);
  for (let k = words.length; k >= 1; k--) {
    if (matchesAnswer(words.slice(0, k).join(" "), brand, brandAliases)) {
      return words.slice(k).join(" ");
    }
  }
  return null;
}

export type Judgement = {
  brandCorrect: boolean;
  modelCorrect: boolean;
  /** The model text that was actually judged ("" when none was given). */
  modelGuess: string;
};

/**
 * Judges one guess against the answer.
 *  - Brand stage: `model` is empty. The brand field may also hold a full
 *    "Brand Model" guess, which solves outright when both parts are right.
 *  - Model stage: `model` is set. A leading brand name in it is ignored, so
 *    typing "Rolex Submariner" into the model box still counts.
 * `modelAliases` must already be scoped to the answer's brand.
 */
export function judgeGuess(
  guess: { brand: string; model: string },
  answer: { brand: string; model: string },
  brandAliases: Map<string, string>,
  modelAliases: Map<string, string>,
): Judgement {
  const rest = afterBrand(guess.brand, answer.brand, brandAliases);
  const brandCorrect = rest !== null;

  let modelGuess = guess.model.trim() ? guess.model : (rest ?? "");
  const stripped = afterBrand(modelGuess, answer.brand, brandAliases);
  if (stripped) modelGuess = stripped;

  const modelCorrect =
    modelGuess.trim().length > 0 && matchesAnswer(modelGuess, answer.model, modelAliases);
  return { brandCorrect, modelCorrect, modelGuess: modelGuess.trim() };
}
