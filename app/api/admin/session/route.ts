import { createSession, isAdminToken, SESSION_DAYS, sessionCookie } from "@/lib/admin-auth";
import { hit, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** 303 back to the admin, setting or clearing the session cookie. */
function back(req: Request, cookie: string | null, query = "") {
  const headers = new Headers({ location: new URL(`/admin/crop${query}`, req.url).toString() });
  if (cookie) headers.append("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

async function signIn(req: Request, token: string | null) {
  if (!(await hit(LIMITS.signin, req)).ok) return back(req, null, "?error=slow");
  if (!isAdminToken(token)) return back(req, null, "?error=token");
  return back(req, sessionCookie(req, createSession(), SESSION_DAYS * 86_400));
}

/**
 * Old-style links (/admin/crop?token=…) land here: sign in, then redirect to
 * the clean URL so the token leaves the address bar and the history.
 */
export async function GET(req: Request) {
  return signIn(req, new URL(req.url).searchParams.get("token"));
}

/** The sign-in form (token=…) and the sign-out button (action=signout). */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (form?.get("action") === "signout") return back(req, sessionCookie(req, "", 0), "?signedout=1");
  const token = form?.get("token");
  return signIn(req, typeof token === "string" ? token.trim() : null);
}
