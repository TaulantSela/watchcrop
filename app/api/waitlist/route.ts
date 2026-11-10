import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { waitlist } from "@/db/schema";

const opt = (max: number) => z.string().trim().max(max).optional();

const Body = z.object({
  email: z.email().max(320),
  source: opt(64),
  utmSource: opt(64),
  utmMedium: opt(64),
  utmCampaign: opt(64),
  referrerHost: opt(255),
  // Bot filters: a field humans never see, and how long the form was open.
  website: z.string().max(200).optional(),
  elapsedMs: z.number().int().nonnegative().optional(),
});

/** Faster than any person types an email address. */
const MIN_FILL_MS = 1500;

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  // Signup count is THE de-risk metric, so keep scripted junk out of it. Bots
  // get the same success response as people, so there's nothing to adapt to.
  const { website, elapsedMs, ...fields } = parsed;
  if (website || (elapsedMs !== undefined && elapsedMs < MIN_FILL_MS)) {
    return NextResponse.json({ ok: true, alreadyOnList: false });
  }

  const email = fields.email.trim().toLowerCase();

  try {
    const db = await getDb();
    const inserted = await db
      .insert(waitlist)
      .values({ ...fields, email, source: fields.source ?? "landing" })
      .onConflictDoNothing({ target: waitlist.email })
      .returning({ id: waitlist.id });

    return NextResponse.json({ ok: true, alreadyOnList: inserted.length === 0 });
  } catch (err) {
    console.error("waitlist insert failed", err);
    return NextResponse.json({ error: "Could not save right now." }, { status: 500 });
  }
}
