"use client";

import { useState } from "react";

export function WaitlistForm({ source = "landing" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setState("done");
      setMessage(data.alreadyOnList ? "You're already on the list — see you at launch." : "You're in. We'll email you when the first puzzle drops.");
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
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full flex-1 rounded-lg border border-white/10 bg-[var(--panel)] px-4 py-3 text-[var(--ink)] outline-none focus:border-[var(--gold)]"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="rounded-lg bg-[var(--gold)] px-6 py-3 font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
      >
        {state === "loading" ? "…" : "Notify me"}
      </button>
      {state === "error" && (
        <p className="text-sm text-red-400 sm:basis-full">{message}</p>
      )}
    </form>
  );
}
