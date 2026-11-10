"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sessionTouch } from "@/lib/attribution";

export function WaitlistForm({ source = "landing" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const mountedAt = useRef(0);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    const honeypot = new FormData(e.currentTarget).get("website");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          source,
          ...sessionTouch(),
          website: honeypot || undefined,
          elapsedMs: mountedAt.current ? Date.now() - mountedAt.current : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setState("done");
      setMessage(
        data.alreadyOnList
          ? "You're already on the list. See you at launch."
          : "You're in. We'll email you when the first puzzle drops.",
      );
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (state === "done") {
    return (
      <p className="rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-emerald-300">
        ✓ {message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <input
        type="email"
        required
        aria-label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full flex-1 rounded-lg border border-white/10 bg-[var(--panel)] px-4 py-3 text-[var(--ink)] outline-none focus:border-[var(--gold)]"
      />
      {/* Honeypot: invisible to people (and screen readers), irresistible to form bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="rounded-lg bg-[var(--gold)] px-6 py-3 font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
      >
        {state === "loading" ? "…" : "Notify me"}
      </button>
      {state === "error" && <p className="text-sm text-red-400 sm:basis-full">{message}</p>}
      <p className="text-xs text-[var(--muted)] sm:basis-full">
        We only use your email for {process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop"} emails.{" "}
        <Link href="/privacy" className="underline hover:text-[var(--ink)]">
          Privacy
        </Link>
      </p>
    </form>
  );
}
