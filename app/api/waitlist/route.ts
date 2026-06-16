import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { waitlist } from "@/db/schema";

const Body = z.object({
  email: z.string().email().max(320),
  source: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const email = parsed.email.trim().toLowerCase();

  try {
    const db = await getDb();
    const inserted = await db
      .insert(waitlist)
      .values({ email, source: parsed.source ?? "landing" })
      .onConflictDoNothing({ target: waitlist.email })
      .returning({ id: waitlist.id });

    return NextResponse.json({ ok: true, alreadyOnList: inserted.length === 0 });
  } catch (err) {
    console.error("waitlist insert failed", err);
    return NextResponse.json({ error: "Could not save right now." }, { status: 500 });
  }
}
