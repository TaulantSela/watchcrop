const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop";

const ERRORS: Record<string, string> = {
  token: "That token doesn't match. Check for a missing character.",
  slow: "Too many attempts. Wait a few minutes and try again.",
};

/**
 * The admin sign-in. A plain form (works without JavaScript) that posts the
 * token to /api/admin/session, which sets a 30-day session cookie. The
 * username field is only there so password managers save and autofill it.
 */
export function AdminSignIn({ error, signedOut }: { error?: string; signedOut?: boolean }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold">{SITE} admin</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Sign in once with your admin token and you&apos;ll stay signed in on this browser for 30 days.
      </p>

      {signedOut && <p className="mt-4 rounded bg-white/5 p-3 text-sm">Signed out.</p>}
      {error && ERRORS[error] && (
        <p role="alert" className="mt-4 rounded bg-red-950/50 p-3 text-sm text-red-300">
          {ERRORS[error]}
        </p>
      )}

      <form method="post" action="/api/admin/session" className="mt-6 flex flex-col gap-3">
        <input
          type="text"
          name="username"
          value="admin"
          autoComplete="username"
          readOnly
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
        <label className="flex flex-col gap-1 text-sm">
          Admin token
          <input
            type="password"
            name="token"
            required
            autoFocus
            autoComplete="current-password"
            spellCheck={false}
            className="rounded border border-white/10 bg-[var(--panel)] px-3 py-2 font-mono outline-none focus:border-[var(--gold)]"
          />
        </label>
        <button className="rounded bg-[var(--gold)] px-4 py-2 font-semibold text-black">Sign in</button>
      </form>

      <p className="mt-6 text-xs leading-relaxed text-[var(--muted)]">
        It&apos;s the <code>ADMIN_TOKEN</code> set in Vercel for this site. Let your browser save it and next time
        it fills itself in.
      </p>
    </main>
  );
}
