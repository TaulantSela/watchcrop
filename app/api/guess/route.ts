import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_CROPS, todayKey } from "@/lib/daily";
import { getAliasMap, getTodayPuzzle, logGuess } from "@/lib/game";
import { matchesAnswer } from "@/lib/normalize";
import { buildReveal } from "@/lib/reveal";
import { cropUrl } from "@/lib/sign";

export const runtime = "nodejs";

const Body = z.object({
  cropIndex: z.number().int().min(0).max(MAX_CROPS - 1),
  brand: z.string().max(80),
  model: z.string().max(120).optional().default(""),
  final: z.boolean().optional().default(false), // client exhausted its guesses
  giveUp: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Always score against the SERVER's notion of today — never trust a client date.
  const date = todayKey();
  const puzzle = await getTodayPuzzle(date);
  if (!puzzle) return NextResponse.json({ error: "no puzzle today" }, { status: 404 });

  const { watch } = puzzle;
  const [brandAliases, modelAliases] = await Promise.all([
    getAliasMap("brand"),
    getAliasMap("model"),
  ]);

  const brandCorrect = matchesAnswer(body.brand, watch.brand, brandAliases);
  const modelCorrect =
    body.model.trim().length > 0 && matchesAnswer(body.model, watch.model, modelAliases);
  const solved = brandCorrect && modelCorrect;

  // Fire-and-forget analytics (await to avoid serverless teardown dropping it).
  await logGuess({
    date,
    cropIndex: body.cropIndex,
    guessBrand: body.brand || null,
    guessModel: body.model || null,
    brandCorrect,
    solved,
  });

  if (solved || body.final || body.giveUp) {
    const reveal = await buildReveal(date, watch);
    return NextResponse.json({ brandCorrect, modelCorrect, solved, reveal });
  }

  // Not solved and not exhausted: hand back the NEXT crop (signed) if any remain.
  const next = body.cropIndex + 1;
  const nextCrop =
    next < MAX_CROPS ? { index: next, url: cropUrl(date, next) } : null;

  return NextResponse.json({ brandCorrect, modelCorrect, solved, nextCrop });
}
