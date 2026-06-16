"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { MAX_CROPS } from "@/lib/daily";
import { buildShareString } from "@/lib/share";
import { medalForCrop } from "@/lib/scoring";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop";

type Meta =
  | { available: true; date: string; puzzleNumber: number; maxCrops: number; firstCropUrl: string }
  | { available: false; date: string };

type Reveal = {
  brand: string;
  model: string;
  reference: string | null;
  year: number | null;
  movement: string | null;
  specBullets: string[];
  fullImageUrl: string;
  shopUrl: string | null;
  marketUrl: string;
  solvedToday: number;
  secondsUntilNext: number;
};

type GuessResponse = {
  brandCorrect: boolean;
  modelCorrect: boolean;
  solved: boolean;
  nextCrop?: { index: number; url: string } | null;
  reveal?: Reveal;
};

type Stats = {
  lastDate: string;
  streak: number;
  maxStreak: number;
  played: number;
  wins: number;
  lastSolvedCrop: number | null; // null = lost
};

const STATS_KEY = "watchcrop:stats";

function loadStats(): Stats {
  if (typeof window === "undefined")
    return { lastDate: "", streak: 0, maxStreak: 0, played: 0, wins: 0, lastSolvedCrop: null };
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || "") as Stats;
  } catch {
    return { lastDate: "", streak: 0, maxStreak: 0, played: 0, wins: 0, lastSolvedCrop: null };
  }
}

export function Game() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [catalog, setCatalog] = useState<{ brands: string[]; models: string[] }>({
    brands: [],
    models: [],
  });

  const [cropIndex, setCropIndex] = useState(0);
  const [cropUrls, setCropUrls] = useState<Record<number, string>>({});
  const [brandSolved, setBrandSolved] = useState(false);
  const [knownBrand, setKnownBrand] = useState("");
  const [input, setInput] = useState("");
  const [usedHint, setUsedHint] = useState(false);
  const [usedPartialGrace, setUsedPartialGrace] = useState(false);
  const [note, setNote] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [finished, setFinished] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [solvedCropIndex, setSolvedCropIndex] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [copied, setCopied] = useState(false);
  const statsWritten = useRef(false);

  // --- bootstrap ---
  useEffect(() => {
    (async () => {
      const [m, c] = await Promise.all([
        fetch("/api/puzzle/today").then((r) => r.json()),
        fetch("/api/catalog").then((r) => r.json()),
      ]);
      setMeta(m);
      setCatalog(c);
      if (m.available) setCropUrls({ 0: m.firstCropUrl });

      // Already played today? Show the post-game panel instead of replaying.
      const s = loadStats();
      if (m.available && s.lastDate === m.date) {
        setFinished(true);
        setSolvedCropIndex(s.lastSolvedCrop);
        statsWritten.current = true;
      }
    })();
  }, []);

  const date = meta?.available ? meta.date : "";
  const puzzleNumber = meta?.available ? meta.puzzleNumber : 0;
  const maxCrops = meta?.available ? meta.maxCrops : MAX_CROPS;
  const isLastCrop = cropIndex === maxCrops - 1;

  // --- autocomplete ---
  const brandFuse = useMemo(() => new Fuse(catalog.brands, { threshold: 0.4 }), [catalog.brands]);
  const modelOptions = useMemo(() => {
    if (!knownBrand) return [];
    const prefix = `${knownBrand.toLowerCase()} `;
    return catalog.models
      .filter((m) => m.toLowerCase().startsWith(prefix))
      .map((m) => m.slice(knownBrand.length + 1));
  }, [catalog.models, knownBrand]);
  const modelFuse = useMemo(() => new Fuse(modelOptions, { threshold: 0.4 }), [modelOptions]);

  const suggestions = useMemo(() => {
    if (input.trim().length < 1) return [];
    const fuse = brandSolved ? modelFuse : brandFuse;
    return fuse.search(input).slice(0, 6).map((r) => r.item);
  }, [input, brandSolved, brandFuse, modelFuse]);

  // --- helpers ---
  const writeStats = useCallback(
    (solvedIdx: number | null) => {
      if (statsWritten.current) return;
      statsWritten.current = true;
      setStats((prev) => {
        const won = solvedIdx !== null;
        const next: Stats = {
          lastDate: date,
          streak: won ? prev.streak + 1 : 0,
          maxStreak: Math.max(prev.maxStreak, won ? prev.streak + 1 : prev.streak),
          played: prev.played + 1,
          wins: prev.wins + (won ? 1 : 0),
          lastSolvedCrop: solvedIdx,
        };
        try {
          localStorage.setItem(STATS_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [date],
  );

  const finish = useCallback(
    (rev: Reveal | null, solvedIdx: number | null) => {
      setReveal(rev);
      setSolvedCropIndex(solvedIdx);
      setFinished(true);
      writeStats(solvedIdx);
    },
    [writeStats],
  );

  const advance = useCallback((next: { index: number; url: string }) => {
    setCropUrls((prev) => ({ ...prev, [next.index]: next.url }));
    setCropIndex(next.index);
    setInput("");
    setNote("");
  }, []);

  async function postGuess(payload: {
    brand: string;
    model: string;
    final: boolean;
  }): Promise<GuessResponse> {
    const res = await fetch("/api/guess", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cropIndex, ...payload }),
    });
    return res.json();
  }

  async function submit() {
    if (busy || finished || !meta?.available) return;
    const value = input.trim();
    if (!value) return;
    setBusy(true);
    setNote("");
    try {
      if (!brandSolved) {
        const res = await postGuess({ brand: value, model: "", final: isLastCrop });
        if (res.brandCorrect) {
          setBrandSolved(true);
          setKnownBrand(value);
          setInput("");
          setNote(`✓ ${value} — now the model.`);
        } else if (res.reveal) {
          finish(res.reveal, null); // wrong on the last crop
        } else if (res.nextCrop) {
          setNote("Not it. Zooming out…");
          advance(res.nextCrop);
        }
      } else {
        const willFinalize = isLastCrop && usedPartialGrace;
        const res = await postGuess({ brand: knownBrand, model: value, final: willFinalize });
        if (res.solved) {
          finish(res.reveal ?? null, cropIndex);
        } else if (!usedPartialGrace) {
          setUsedPartialGrace(true);
          setInput("");
          setNote("Brand's right — one free retry on the model.");
        } else if (isLastCrop && res.reveal) {
          finish(res.reveal, null);
        } else if (res.nextCrop) {
          setNote("Not quite. Zooming out…");
          advance(res.nextCrop);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    if (busy || finished || !meta?.available) return;
    setBusy(true);
    setUsedHint(true);
    try {
      const res = await postGuess({
        brand: brandSolved ? knownBrand : "__skip__",
        model: "",
        final: isLastCrop,
      });
      if (res.reveal) finish(res.reveal, null);
      else if (res.nextCrop) advance(res.nextCrop);
    } finally {
      setBusy(false);
    }
  }

  async function giveUp() {
    if (busy || finished || !meta?.available) return;
    setBusy(true);
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cropIndex, brand: "", model: "", giveUp: true }),
      });
      const data: GuessResponse = await res.json();
      finish(data.reveal ?? null, null);
    } finally {
      setBusy(false);
    }
  }

  // --- render ---
  if (!meta) return <Centered>Loading today&apos;s watch…</Centered>;
  if (!meta.available)
    return (
      <Centered>
        No puzzle scheduled for today. (Run <code className="text-[var(--gold)]">npm run seed</code>{" "}
        or schedule one in <code className="text-[var(--gold)]">/admin/crop</code>.)
      </Centered>
    );

  const medal = solvedCropIndex !== null ? medalForCrop(solvedCropIndex, true) : "none";
  const shareText = buildShareString({
    puzzleNumber,
    solvedCropIndex,
    medal,
    usedHint,
    gotReference: false,
    streak: stats.streak,
    siteName: SITE,
  });

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex items-center justify-between text-sm text-[var(--muted)]">
        <span className="font-semibold text-[var(--ink)]">
          {SITE} #{puzzleNumber}
        </span>
        <span>
          crop {Math.min(cropIndex + 1, maxCrops)} / {maxCrops}
          {stats.streak > 0 && <> · 🔥 {stats.streak}</>}
        </span>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={finished && reveal ? reveal.fullImageUrl : cropUrls[cropIndex]}
        alt="watch crop"
        className="aspect-square w-full rounded-2xl border border-white/10 bg-black"
      />

      {!finished ? (
        <>
          <div className="relative">
            <div className="flex gap-2">
              {brandSolved && (
                <span className="flex items-center rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 text-sm text-emerald-300">
                  {knownBrand} ✓
                </span>
              )}
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={brandSolved ? "Model (e.g. Submariner)" : "Brand (e.g. Omega)"}
                className="w-full rounded-lg border border-white/10 bg-[var(--panel)] px-4 py-3 outline-none focus:border-[var(--gold)]"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-[var(--panel)]">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="block w-full px-4 py-2 text-left hover:bg-white/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {note && <p className="text-sm text-[var(--muted)]">{note}</p>}

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="flex-1 rounded-lg bg-[var(--gold)] px-4 py-3 font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
            >
              Guess
            </button>
            <button
              onClick={skip}
              disabled={busy}
              className="rounded-lg border border-white/10 px-4 py-3 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
              title="Zoom out without a guess (counts as a hint)"
            >
              Skip
            </button>
            <button
              onClick={giveUp}
              disabled={busy}
              className="rounded-lg border border-white/10 px-4 py-3 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Give up
            </button>
          </div>
        </>
      ) : (
        <Result
          reveal={reveal}
          solvedCropIndex={solvedCropIndex}
          stats={stats}
          shareText={shareText}
          copied={copied}
          onCopy={async () => {
            await navigator.clipboard.writeText(shareText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        />
      )}
    </div>
  );
}

function Result({
  reveal,
  solvedCropIndex,
  stats,
  shareText,
  copied,
  onCopy,
}: {
  reveal: Reveal | null;
  solvedCropIndex: number | null;
  stats: Stats;
  shareText: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const won = solvedCropIndex !== null;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold">
        {won ? `Solved on crop ${solvedCropIndex + 1}! 🎉` : "Out of guesses."}
      </p>

      {reveal ? (
        <div className="rounded-xl border border-white/10 bg-[var(--panel)] p-4">
          <p className="text-xl font-bold">
            {reveal.brand} {reveal.model}
          </p>
          <p className="text-sm text-[var(--muted)]">
            {[reveal.reference, reveal.year, reveal.movement].filter(Boolean).join(" · ")}
          </p>
          {reveal.specBullets.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-sm text-[var(--muted)]">
              {reveal.specBullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-col gap-2">
            {reveal.shopUrl ? (
              <a
                href={reveal.shopUrl}
                rel="nofollow sponsored"
                className="rounded-lg bg-[var(--gold)] px-4 py-2.5 text-center font-semibold text-black"
              >
                Want it? Shop this reference →
              </a>
            ) : (
              <a
                href={reveal.marketUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/15 px-4 py-2.5 text-center"
              >
                See market prices →
              </a>
            )}
            <p className="text-center text-[11px] text-[var(--muted)]">
              Shopping links may be affiliate links.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-[var(--muted)]">Come back tomorrow for a new watch.</p>
      )}

      <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-[var(--panel)] p-4 text-center text-lg leading-snug">
        {shareText}
      </pre>

      <button
        onClick={onCopy}
        className="rounded-lg bg-[var(--gold)] px-4 py-3 font-semibold text-black transition hover:brightness-110"
      >
        {copied ? "Copied!" : "Share result"}
      </button>

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <Stat label="Streak" value={stats.streak} />
        <Stat label="Max" value={stats.maxStreak} />
        <Stat
          label="Win %"
          value={stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}
        />
      </div>

      {reveal && <Countdown seconds={reveal.secondsUntilNext} solvedToday={reveal.solvedToday} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[var(--panel)] py-3">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
    </div>
  );
}

function Countdown({ seconds, solvedToday }: { seconds: number; solvedToday: number }) {
  const [s, setS] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setS((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <p className="text-center text-sm text-[var(--muted)]">
      {solvedToday.toLocaleString()} solved today · next watch in {hh}:{mm}:{ss}
    </p>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center text-[var(--muted)]">{children}</div>
  );
}
