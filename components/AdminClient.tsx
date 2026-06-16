"use client";

import { useState } from "react";

type Watch = { id: number; brand: string; model: string; reference: string | null; photoSource: string | null };

export function AdminClient({
  token,
  watches,
}: {
  token: string;
  watches: Watch[];
}) {
  const [msg, setMsg] = useState("");

  async function post(payload: Record<string, unknown>) {
    setMsg("…");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": token },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setMsg(res.ok ? `✓ ${JSON.stringify(data)}` : `✗ ${data.error ?? "error"}`);
    if (res.ok) setTimeout(() => location.reload(), 800);
  }

  function addWatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    post({
      action: "addWatch",
      brand: f.get("brand"),
      model: f.get("model"),
      reference: f.get("reference") || undefined,
      year: f.get("year") || undefined,
      movement: f.get("movement") || undefined,
      priceTier: f.get("priceTier"),
      difficultyWeight: f.get("difficultyWeight"),
      affiliateRef: f.get("affiliateRef") || undefined,
      affiliateUrl: f.get("affiliateUrl") || undefined,
      photoSource: f.get("photoSource") || undefined,
      specBullets: String(f.get("specBullets") || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  function schedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    post({ action: "schedule", watchId: f.get("watchId"), puzzleDate: f.get("puzzleDate") });
  }

  const field = "rounded border border-white/10 bg-[var(--panel)] px-3 py-2 outline-none focus:border-[var(--gold)]";

  return (
    <div className="flex flex-col gap-8">
      {msg && <p className="rounded bg-[var(--panel)] p-3 text-sm">{msg}</p>}

      <section>
        <h2 className="mb-3 font-semibold">Add a watch</h2>
        <form onSubmit={addWatch} className="grid grid-cols-2 gap-3">
          <input name="brand" placeholder="Brand *" required className={field} />
          <input name="model" placeholder="Model family *" required className={field} />
          <input name="reference" placeholder="Reference" className={field} />
          <input name="year" type="number" placeholder="Year" className={field} />
          <input name="movement" placeholder="Movement" className={field} />
          <select name="priceTier" className={field} defaultValue="mid">
            <option value="entry">entry</option>
            <option value="mid">mid</option>
            <option value="luxury">luxury</option>
            <option value="grail">grail</option>
          </select>
          <input name="difficultyWeight" type="number" min={1} max={5} defaultValue={2} placeholder="Difficulty 1-5" className={field} />
          <select name="photoSource" className={field} defaultValue="own">
            <option value="own">own (you shot it)</option>
            <option value="licensed">licensed</option>
            <option value="cc-by">cc-by</option>
            <option value="community">community</option>
          </select>
          <input name="affiliateRef" placeholder="Affiliate ref key" className={field} />
          <input name="affiliateUrl" placeholder="Affiliate URL" className={field} />
          <textarea name="specBullets" placeholder="Spec bullets (one per line)" className={`${field} col-span-2`} rows={3} />
          <button className="col-span-2 rounded bg-[var(--gold)] px-4 py-2 font-semibold text-black">
            Add watch
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Schedule a puzzle</h2>
        <form onSubmit={schedule} className="flex flex-wrap gap-3">
          <select name="watchId" required className={field}>
            <option value="">Pick a watch…</option>
            {watches.map((w) => (
              <option key={w.id} value={w.id}>
                {w.brand} {w.model} {w.reference ?? ""} {w.photoSource ? "" : "⚠ no source"}
              </option>
            ))}
          </select>
          <input name="puzzleDate" type="date" required className={field} />
          <button className="rounded bg-[var(--gold)] px-4 py-2 font-semibold text-black">Schedule</button>
        </form>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Watches without a photo source are refused by the scheduler (provenance gate).
        </p>
      </section>
    </div>
  );
}
