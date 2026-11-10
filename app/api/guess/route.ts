import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_CROPS, todayKey } from "@/lib/daily";
import { getBrandAliasMap, getModelAliasMap, getTodayPuzzle, logGuess } from "@/lib/game";
import { judgeGuess } from "@/lib/normalize";
import { buildReveal } from "@/lib/reveal";
import { cropUrl, verifyCrop } from "@/lib/sign";

export const runtime = "nodejs";

const Body = z.object({
  /** The puzzle day the client is playing; must still be today. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cropIndex: z.number().int().min(0).max(MAX_CROPS - 1),
  /** The signed token of the crop being guessed on: proof it was earned. */
  token: z.string().max(128),
  kind: z.enum(["guess", "skip", "giveUp"]).default("guess"),
  brand: z.string().max(80).default(""),
  model: z.string().max(120).default(""),
  /** Model stage only: the client has no retries left on the last crop. */
  final: z.boolean().default(false),
  playerId: z.uuid().optional(),
});

export async function POST(req: Request) {
  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Always score against the SERVER's notion of today. A client still on
  // yesterday's puzzle gets told to reload, not scored against a new watch.
  const date = todayKey();
  if (body.date !== date) {
    return NextResponse.json({ error: "a new puzzle is out", date }, { status: 409 });
  }

  // You can only act on a crop you were given. Without this, posting
  // cropIndex: 4 handed back crop 6 (the whole watch) without playing.
  if (!verifyCrop(date, body.cropIndex, body.token)) {
    return NextResponse.json({ error: "crop not unlocked" }, { status: 403 });
  }

  const puzzle = await getTodayPuzzle(date);
  if (!puzzle) return NextResponse.json({ error: "no puzzle today" }, { status: 404 });
  const { watch } = puzzle;
  const isLastCrop = body.cropIndex === MAX_CROPS - 1;

  let brandCorrect = false;
  let modelCorrect = false;
  let modelGuess = "";
  if (body.kind === "guess") {
    const [brandAliases, modelAliases] = await Promise.all([
      getBrandAliasMap(),
      getModelAliasMap(watch.brand),
    ]);
    ({ brandCorrect, modelCorrect, modelGuess } = judgeGuess(
      { brand: body.brand, model: body.model },
      watch,
      brandAliases,
      modelAliases,
    ));
  }
  const solved = brandCorrect && modelCorrect;
  // A right brand in the brand stage always earns a model guess, even on the
  // last crop: it must never come back with the answer attached.
  const owedModelGuess = body.kind === "guess" && !body.model.trim() && brandCorrect && !solved;

  const exhausted =
    body.kind === "giveUp" ||
    (body.kind === "skip" && isLastCrop) ||
    (body.kind === "guess" && !solved && !owedModelGuess && (body.final || (isLastCrop && !body.model.trim())));

  // Awaited (not fire-and-forget) so serverless teardown can't drop it, and so
  // the solver is already counted in their own "solved today".
  await logGuess({
    date,
    cropIndex: body.cropIndex,
    guessBrand: body.kind === "guess" ? body.brand || null : null,
    guessModel: modelGuess || null,
    brandCorrect,
    solved,
    playerId: body.playerId ?? null,
  });

  // The canonical brand is safe to return once guessed: it fixes the model
  // autocomplete after an alias guess like "AP".
  const base = { brandCorrect, modelCorrect, solved, brand: brandCorrect ? watch.brand : undefined };

  if (solved || exhausted) {
    return NextResponse.json({ ...base, reveal: await buildReveal(date, watch) });
  }
  if (owedModelGuess) return NextResponse.json(base);

  // A miss: hand back the NEXT crop (signed). The client decides whether its
  // free model retry applies before using it.
  const next = body.cropIndex + 1;
  const nextCrop = next < MAX_CROPS ? { index: next, url: cropUrl(date, next) } : null;
  return NextResponse.json({ ...base, nextCrop });
}
