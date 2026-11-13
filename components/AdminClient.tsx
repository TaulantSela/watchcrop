"use client";

import { useState } from "react";
import type { Runway } from "@/lib/schedule";
import { PhotoPanel, type PhotoInfo } from "./AdminPhotoPanel";

export type AdminWatch = {
  id: number;
  brand: string;
  model: string;
  reference: string | null;
  photoSource: string | null;
  distinctiveDesign: boolean;
  /** Cut crop files (0–6). */
  cropCount: number;
  logoQaAt: string | null;
  /** Why it can't be scheduled yet; empty = ready. */
  problems: string[];
  photo: PhotoInfo;
};

export type UpcomingDay = { date: string; puzzle: { n: number; name: string } | null };

const field =
  "rounded border border-white/10 bg-[var(--panel)] px-3 py-2 outline-none focus:border-[var(--gold)]";
const button = "rounded bg-[var(--gold)] px-4 py-2 font-semibold text-black disabled:opacity-50";
const quiet = "rounded border border-white/15 px-3 py-1.5 text-sm hover:border-white/40";

function lines(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function text(v: FormDataEntryValue | null): string | undefined {
  const s = String(v ?? "").trim();
  return s || undefined;
}

export function AdminClient({
  today,
  runway,
  upcoming,
  watches,
}: {
  today: string;
  runway: Runway;
  upcoming: UpcomingDay[];
  watches: AdminWatch[];
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  async function post(payload: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ ok: true, text: "Saved." });
        setTimeout(() => location.reload(), 600);
      } else {
        const details = [...(data.problems ?? []), ...(data.detail ?? [])];
        setMsg({ ok: false, text: [data.error ?? `error ${res.status}`, ...details].join("\n• ") });
      }
    } catch {
      setMsg({ ok: false, text: "Couldn't reach the server." });
    } finally {
      setBusy(false);
    }
  }

  function addWatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    post({
      action: "addWatch",
      brand: f.get("brand"),
      model: f.get("model"),
      reference: text(f.get("reference")),
      year: text(f.get("year")),
      movement: text(f.get("movement")),
      priceTier: f.get("priceTier"),
      difficultyWeight: f.get("difficultyWeight"),
      affiliateRef: text(f.get("affiliateRef")),
      affiliateUrl: text(f.get("affiliateUrl")),
      photoSource: text(f.get("photoSource")),
      photoLicense: text(f.get("photoLicense")),
      attribution: text(f.get("attribution")),
      distinctiveDesign: f.get("distinctiveDesign") === "on",
      // Newlines only: a spec like "41mm, Oystersteel" must stay one bullet.
      specBullets: String(f.get("specBullets") ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      brandAliases: lines(f.get("brandAliases")),
      modelAliases: lines(f.get("modelAliases")),
    });
  }

  function saveCrops(watchId: number, cropSpecs: unknown[], logoMasks: unknown[]) {
    post({ action: "setCrops", watchId, cropSpecs, logoMasks });
  }

  function markQa(w: AdminWatch) {
    const confirmText =
      `Sign off the logo check for ${w.brand} ${w.model}?\n\n` +
      "You looked at all 6 crops and no logo, wordmark or signed text survives in any of them" +
      (w.distinctiveDesign
        ? ", and crop 1 doesn't isolate the protected design feature (trade dress)."
        : ".");
    if (confirm(confirmText)) post({ action: "markQa", watchId: w.id });
  }

  function schedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    post({ action: "schedule", watchId: f.get("watchId"), puzzleDate: f.get("puzzleDate") });
  }

  const ready = watches.filter((w) => w.problems.length === 0);

  return (
    <div className="flex flex-col gap-10">
      {msg && (
        <p
          role="status"
          className={`whitespace-pre-line rounded p-3 text-sm ${msg.ok ? "bg-emerald-950/50 text-emerald-300" : "bg-red-950/50 text-red-300"}`}
        >
          {msg.text}
        </p>
      )}

      {/* --- Runway: the solvency metric --- */}
      <section id="runway" className="scroll-mt-6 rounded-xl border border-white/10 bg-[var(--panel)] p-4">
        <h2 className="mb-1 font-semibold">Runway</h2>
        {runway.days === 0 ? (
          <p className="font-semibold text-red-400">Today ({today}) has no puzzle.</p>
        ) : (
          <p>
            <span className="text-2xl font-bold">{runway.days}</span> day{runway.days === 1 ? "" : "s"}{" "}
            scheduled back to back, through {runway.through}.
          </p>
        )}
        <p className="text-sm text-[var(--muted)]">
          {runway.scheduledAhead} of the next 180 days scheduled (target: all 180 before launch).
          {runway.gapCount > 0 && <> Next empty days: {runway.nextGaps.join(", ")}.</>}
        </p>
      </section>

      {/* --- Next two weeks --- */}
      <section>
        <h2 className="mb-3 font-semibold">Next 14 days</h2>
        <ul className="divide-y divide-white/5 text-sm">
          {upcoming.map((d) => (
            <li key={d.date} className="flex items-center justify-between gap-3 py-2">
              <span className="w-28 font-mono text-[var(--muted)]">{d.date}</span>
              {d.puzzle ? (
                <span className="flex-1">
                  #{d.puzzle.n} · {d.puzzle.name}
                </span>
              ) : (
                <span className="flex-1 text-red-400">empty</span>
              )}
              {d.puzzle && d.date > today && (
                <button
                  className={quiet}
                  disabled={busy}
                  onClick={() => confirm(`Unschedule ${d.date}?`) && post({ action: "unschedule", puzzleDate: d.date })}
                >
                  Unschedule
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* --- Schedule --- */}
      <section id="schedule" className="scroll-mt-6">
        <h2 className="mb-3 font-semibold">Schedule a puzzle</h2>
        <form onSubmit={schedule} className="flex flex-wrap gap-3">
          <select name="watchId" required className={field} defaultValue="">
            <option value="" disabled>
              {ready.length ? "Pick a ready watch…" : "No watch is ready yet (see Catalog)"}
            </option>
            {watches.map((w) => (
              <option key={w.id} value={w.id} disabled={w.problems.length > 0}>
                {w.brand} {w.model} {w.reference ?? ""} {w.problems.length ? "· not ready" : ""}
              </option>
            ))}
          </select>
          <input name="puzzleDate" type="date" required min={today} className={field} />
          <button className={button} disabled={busy || ready.length === 0}>
            Schedule
          </button>
        </form>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Puzzle numbers follow the calendar from puzzle #1. Only watches that pass the provenance
          and logo checks below can be scheduled.
        </p>
      </section>

      {/* --- Catalog + readiness --- */}
      <section id="catalog" className="scroll-mt-6">
        <h2 className="mb-3 font-semibold">Catalog ({watches.length})</h2>
        <ul className="flex flex-col gap-3">
          {watches.map((w) => (
            <li key={w.id} className="rounded-lg border border-white/10 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  #{w.id} {w.brand} {w.model} {w.reference && <span className="text-[var(--muted)]">{w.reference}</span>}
                  {w.distinctiveDesign && (
                    <span className="ml-2 rounded bg-amber-900/50 px-1.5 text-xs text-amber-300">trade dress</span>
                  )}
                </span>
                <span className="flex gap-2">
                  <button className={quiet} onClick={() => setEditing(editing === w.id ? null : w.id)}>
                    {editing === w.id ? "Close" : "Photo & crops"}
                  </button>
                  {!w.logoQaAt && w.cropCount === 6 && (
                    <button className={quiet} disabled={busy} onClick={() => markQa(w)}>
                      Sign off logo check
                    </button>
                  )}
                </span>
              </div>
              <p className="mt-1 text-[var(--muted)]">
                photo: {w.photoSource ?? "—"} · master:{" "}
                {w.photo.masterSize ? `${w.photo.masterSize.width}×${w.photo.masterSize.height}` : "—"} · crops:{" "}
                {w.cropCount}/6 · logo check: {w.logoQaAt ? w.logoQaAt.slice(0, 10) : "not done"}
                {w.photo.scheduled && " · scheduled"}
              </p>
              {w.problems.length === 0 ? (
                <p className="mt-1 text-emerald-400">✓ Ready to schedule</p>
              ) : (
                <ul className="mt-1 list-inside list-disc text-amber-300">
                  {w.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              {editing === w.id && (
                <PhotoPanel
                  watch={w.photo}
                  busy={busy}
                  onSaveCrops={saveCrops}
                  onMessage={(ok, text) => setMsg({ ok, text })}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* --- Add watch --- */}
      <section id="add-watch" className="scroll-mt-6">
        <h2 className="mb-1 font-semibold">Add a watch</h2>
        <p className="mb-3 text-xs text-[var(--muted)]">Save it first, then add its photo under Photo &amp; crops.</p>
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
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            Difficulty
            <input name="difficultyWeight" type="number" min={1} max={5} defaultValue={2} className={`${field} w-20`} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input name="distinctiveDesign" type="checkbox" /> Protected design (trade dress)
          </label>

          <fieldset className="col-span-2 grid grid-cols-2 gap-3 rounded border border-white/10 p-3">
            <legend className="px-1 text-sm text-[var(--muted)]">Photo provenance *</legend>
            {/* No default on purpose: a preselected "own" let every watch through the gate. */}
            <select name="photoSource" required className={field} defaultValue="">
              <option value="" disabled>
                Where is the photo from? *
              </option>
              <option value="own">own (you shot it)</option>
              <option value="licensed">licensed (paid commercial license)</option>
              <option value="cc-by">CC BY / CC0 (never CC BY-SA)</option>
              <option value="community">community submission (lead only, not schedulable)</option>
            </select>
            <input name="photoLicense" placeholder="License (required if licensed)" className={field} />
            <input name="attribution" placeholder="Attribution (required for CC BY)" className={`${field} col-span-2`} />
          </fieldset>

          <input name="affiliateRef" placeholder="Affiliate ref (e.g. omega-speedmaster)" className={`${field} col-span-2`} />
          <input name="affiliateUrl" placeholder="Affiliate URL (https://…)" className={`${field} col-span-2`} />
          <textarea name="brandAliases" rows={2} placeholder="Brand aliases, comma or line separated (e.g. AP)" className={field} />
          <textarea name="modelAliases" rows={2} placeholder="Model aliases (e.g. RO, Jumbo)" className={field} />
          <textarea name="specBullets" rows={3} placeholder="Spec bullets (one per line)" className={`${field} col-span-2`} />
          <button className={`${button} col-span-2`} disabled={busy}>
            Add watch
          </button>
        </form>
      </section>
    </div>
  );
}
