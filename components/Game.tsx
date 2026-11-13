"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { MAX_CROPS, secondsUntilNext, todayKey } from "@/lib/daily";
import { normalize } from "@/lib/normalize";
import { buildShareString } from "@/lib/share";
import { horologyScore, medalForCrop } from "@/lib/scoring";
import { EMPTY_STATS, liveStreak, parseStats, recordResult, type Stats } from "@/lib/stats";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop";

type Meta =
  | { available: true; date: string; puzzleNumber: number; maxCrops: number; firstCropUrl: string }
  | { available: false; date: string };

type Catalog = { brands: string[]; models: { brand: string; model: string }[] };

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
  difficultyWeight?: number; // absent in games saved before scores existed
};

type GuessResponse = {
  brandCorrect: boolean;
  modelCorrect: boolean;
  solved: boolean;
  brand?: string; // canonical brand, sent once guessed
  nextCrop?: { index: number; url: string } | null;
  reveal?: Reveal;
};

/** Everything about today's game that must survive a reload. */
type GameState = {
  cropIndex: number;
  cropUrls: Record<number, string>;
  brandSolved: boolean;
  knownBrand: string;
  usedHint: boolean;
  usedPartialGrace: boolean;
  finished: boolean;
  reveal: Reveal | null;
  solvedCropIndex: number | null;
};

const STATS_KEY = "watchcrop:stats";
const PLAYER_KEY = "watchcrop:player";
const GAME_PREFIX = "watchcrop:game:";

function newGame(firstCropUrl = ""): GameState {
  return {
    cropIndex: 0,
    cropUrls: firstCropUrl ? { 0: firstCropUrl } : {},
    brandSolved: false,
    knownBrand: "",
    usedHint: false,
    usedPartialGrace: false,
    finished: false,
    reveal: null,
    solvedCropIndex: null,
  };
}

// localStorage can throw (private mode, blocked storage): never let it break play.
function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function loadGame(date: string): GameState | null {
  try {
    const raw = storageGet(GAME_PREFIX + date);
    return raw ? { ...newGame(), ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

/** Keeps only today's saved game so storage doesn't grow by one entry a day. */
function pruneOldGames(date: string) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(GAME_PREFIX) && key !== GAME_PREFIX + date) localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

/** A random per-device id (no account, no PII) so "solved today" counts players. */
function getPlayerId(): string | undefined {
  let id = storageGet(PLAYER_KEY);
  if (!id) {
    try {
      id = crypto.randomUUID();
    } catch {
      return undefined; // insecure context: just don't send one
    }
    storageSet(PLAYER_KEY, id);
  }
  return id;
}

function tokenOf(cropUrl: string | undefined): string {
  return cropUrl ? (new URL(cropUrl, "http://local").searchParams.get("t") ?? "") : "";
}

/** A failure with a message meant for the player (not "check your connection"). */
class PlayerFacingError extends Error {}

/** Today's puzzle and the autocomplete index. Pure fetch: no React state. */
async function fetchBootstrap(): Promise<{ meta: Meta; catalog: Catalog }> {
  const [mRes, cRes] = await Promise.all([fetch("/api/puzzle/today"), fetch("/api/catalog")]);
  if (!mRes.ok || !cRes.ok) throw new Error("load failed");
  return { meta: await mRes.json(), catalog: await cRes.json() };
}

export function Game() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [catalog, setCatalog] = useState<Catalog>({ brands: [], models: [] });
  const [game, setGame] = useState<GameState>(newGame);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);

  const [input, setInput] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [rolledOver, setRolledOver] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  // --- bootstrap: today's puzzle, the autocomplete index, and any saved game ---
  // State is only set in the promise callbacks, never synchronously in the effect.
  const load = useCallback(() => {
    fetchBootstrap().then(
      ({ meta: m, catalog: c }) => {
        const s = parseStats(storageGet(STATS_KEY));
        setStats(s);
        setCatalog(c);
        if (m.available) {
          pruneOldGames(m.date);
          const saved = loadGame(m.date);
          if (saved) {
            setGame(saved); // resume mid-game, or show the finished board + reveal
          } else if (s.lastDate === m.date) {
            // Finished today on a build that didn't save the board.
            setGame({ ...newGame(m.firstCropUrl), finished: true, solvedCropIndex: s.lastSolvedCrop });
          } else {
            setGame(newGame(m.firstCropUrl));
          }
        }
        setMeta(m);
      },
      () => setLoadError(true),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Persist every change, so a reload resumes instead of restarting at crop 1.
  useEffect(() => {
    if (meta?.available) storageSet(GAME_PREFIX + meta.date, JSON.stringify(game));
  }, [game, meta]);

  const date = meta?.available ? meta.date : "";
  const puzzleNumber = meta?.available ? meta.puzzleNumber : 0;
  const maxCrops = meta?.available ? meta.maxCrops : MAX_CROPS;
  const { cropIndex, brandSolved, knownBrand, usedPartialGrace, finished, reveal, solvedCropIndex } =
    game;
  const isLastCrop = cropIndex === maxCrops - 1;
  const streak = liveStreak(stats, date);

  // --- autocomplete ---
  const brandFuse = useMemo(() => new Fuse(catalog.brands, { threshold: 0.4 }), [catalog.brands]);
  const modelOptions = useMemo(() => {
    if (!knownBrand) return [];
    const b = normalize(knownBrand);
    return catalog.models.filter((m) => normalize(m.brand) === b).map((m) => m.model);
  }, [catalog.models, knownBrand]);
  const modelFuse = useMemo(() => new Fuse(modelOptions, { threshold: 0.4 }), [modelOptions]);

  // --- result bookkeeping ---
  function finish(rev: Reveal | null, solvedIdx: number | null) {
    setGame((g) => ({ ...g, finished: true, reveal: rev, solvedCropIndex: solvedIdx }));
    const next = recordResult(stats, date, solvedIdx);
    if (next !== stats) {
      setStats(next);
      storageSet(STATS_KEY, JSON.stringify(next));
    }
  }

  function advance(next: { index: number; url: string }) {
    setGame((g) => ({
      ...g,
      cropIndex: next.index,
      cropUrls: { ...g.cropUrls, [next.index]: next.url },
    }));
    setInput("");
  }

  /** POSTs one action for the current crop. Null = the day rolled over. */
  async function postGuess(payload: {
    kind?: "guess" | "skip" | "giveUp";
    brand?: string;
    model?: string;
    final?: boolean;
  }): Promise<GuessResponse | null> {
    const res = await fetch("/api/guess", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date,
        cropIndex,
        token: tokenOf(game.cropUrls[cropIndex]),
        playerId: getPlayerId(),
        ...payload,
      }),
    });
    if (res.status === 409) {
      setRolledOver(true);
      return null;
    }
    if (res.status === 429) {
      throw new PlayerFacingError("Too many guesses from your network. Try again in a few minutes.");
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.code === "bot") {
        throw new PlayerFacingError("Couldn't verify your browser. Reload the page and try again.");
      }
      throw new Error(`guess failed: ${res.status}`);
    }
    return res.json();
  }

  async function run(action: () => Promise<void>) {
    if (busy || finished || rolledOver || !meta?.available) return;
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setNote(err instanceof PlayerFacingError ? err.message : "Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const submit = () =>
    run(async () => {
      const value = input.trim();
      if (!value) return;
      setNote("");

      if (!brandSolved) {
        // The brand box also accepts a full "Brand Model" guess.
        const res = await postGuess({ brand: value });
        if (!res) return;
        if (res.solved) {
          finish(res.reveal ?? null, cropIndex);
        } else if (res.brandCorrect) {
          const brand = res.brand ?? value;
          setGame((g) => ({ ...g, brandSolved: true, knownBrand: brand }));
          setInput("");
          setNote(`✓ ${brand}. Now the model.`);
        } else if (res.reveal) {
          finish(res.reveal, null); // wrong on the last crop
        } else if (res.nextCrop) {
          advance(res.nextCrop);
          setNote("Not it. Zooming out…");
        }
        return;
      }

      const res = await postGuess({
        brand: knownBrand,
        model: value,
        final: isLastCrop && usedPartialGrace,
      });
      if (!res) return;
      if (res.solved) {
        finish(res.reveal ?? null, cropIndex);
      } else if (res.reveal) {
        finish(res.reveal, null); // out of retries on the last crop
      } else if (!usedPartialGrace) {
        setGame((g) => ({ ...g, usedPartialGrace: true }));
        setInput("");
        setNote("Brand's right. One free retry on the model.");
      } else if (res.nextCrop) {
        advance(res.nextCrop);
        setNote("Not quite. Zooming out…");
      }
    });

  const skip = () =>
    run(async () => {
      setGame((g) => ({ ...g, usedHint: true }));
      const res = await postGuess({ kind: "skip" });
      if (!res) return;
      setNote("");
      if (res.reveal) finish(res.reveal, null);
      else if (res.nextCrop) advance(res.nextCrop);
    });

  const giveUp = () =>
    run(async () => {
      const res = await postGuess({ kind: "giveUp" });
      if (res) finish(res.reveal ?? null, null);
    });

  async function shareResult(text: string) {
    // Phones get the native share sheet; everything else copies to the clipboard.
    const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    if (coarse && typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // sheet closed
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed"); // blocked clipboard: the text is selectable above
    }
    setTimeout(() => setCopyState("idle"), 2500);
  }

  // --- render ---
  if (loadError)
    return (
      <Centered>
        Couldn&apos;t load today&apos;s watch.{" "}
        <button
          onClick={() => {
            setLoadError(false);
            load();
          }}
          className="text-[var(--gold)] underline"
        >
          Try again
        </button>
      </Centered>
    );
  if (!meta) return <Centered>Loading today&apos;s watch…</Centered>;
  if (!meta.available)
    return (
      <Centered>
        No puzzle scheduled for today. (Run <code className="text-[var(--gold)]">npm run seed</code>{" "}
        or schedule one in <code className="text-[var(--gold)]">/admin/crop</code>.)
      </Centered>
    );

  const medal = solvedCropIndex !== null ? medalForCrop(solvedCropIndex, true) : "none";
  const score =
    reveal?.difficultyWeight !== undefined && solvedCropIndex !== null
      ? horologyScore({
          cropIndex: solvedCropIndex,
          solved: true,
          difficultyWeight: reveal.difficultyWeight,
          gotReference: false,
          usedHint: game.usedHint,
          partialRetries: usedPartialGrace ? 1 : 0,
        })
      : null;
  const shareText = buildShareString({
    puzzleNumber,
    solvedCropIndex,
    medal,
    usedHint: game.usedHint,
    gotReference: false,
    streak,
    siteName: SITE,
    score,
    url: `${location.host}/s`,
  });

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex items-center justify-between text-sm text-[var(--muted)]">
        <span className="font-semibold text-[var(--ink)]">
          {SITE} #{puzzleNumber}
        </span>
        <span>
          crop {Math.min(cropIndex + 1, maxCrops)} / {maxCrops}
          {streak > 0 && <> · 🔥 {streak}</>}
        </span>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={finished && reveal ? reveal.fullImageUrl : game.cropUrls[cropIndex]}
        alt={finished && reveal ? `${reveal.brand} ${reveal.model}` : `Watch detail, crop ${cropIndex + 1} of ${maxCrops}`}
        className="aspect-square w-full rounded-2xl border border-white/10 bg-black"
      />

      {rolledOver ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-[var(--panel)] p-4 text-center">
          <p>A new watch just dropped, so this one has closed.</p>
          <button
            onClick={() => location.reload()}
            className="rounded-lg bg-[var(--gold)] px-5 py-2.5 font-semibold text-black"
          >
            Play the new one →
          </button>
        </div>
      ) : !finished ? (
        <>
          <GuessInput
            key={brandSolved ? "model" : "brand"}
            value={input}
            onChange={setInput}
            onSubmit={submit}
            fuse={brandSolved ? modelFuse : brandFuse}
            label={brandSolved ? "Model" : "Brand"}
            placeholder={brandSolved ? "Model (e.g. Submariner)" : "Brand (e.g. Omega)"}
            prefix={brandSolved ? knownBrand : null}
          />

          <p aria-live="polite" className="min-h-5 text-sm text-[var(--muted)]">
            {note}
          </p>

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="flex-1 rounded-lg bg-[var(--gold)] px-4 py-3 font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
            >
              Guess
            </button>
            {!isLastCrop && (
              <button
                onClick={skip}
                disabled={busy}
                className="rounded-lg border border-white/10 px-4 py-3 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
                title="Zoom out without a guess (counts as a hint)"
              >
                Skip
              </button>
            )}
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
          date={date}
          reveal={reveal}
          solvedCropIndex={solvedCropIndex}
          stats={stats}
          streak={streak}
          score={score}
          shareText={shareText}
          copyState={copyState}
          onShare={() => shareResult(shareText)}
        />
      )}
    </div>
  );
}

/**
 * The guess box with an accessible autocomplete: arrow keys move through
 * suggestions, Enter picks the highlighted one (or submits), Escape and
 * picking close the list so it never sits on top of the buttons.
 */
function GuessInput({
  value,
  onChange,
  onSubmit,
  fuse,
  label,
  placeholder,
  prefix,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  fuse: Fuse<string>;
  label: string;
  placeholder: string;
  prefix: string | null;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const suggestions = useMemo(() => {
    const q = value.trim();
    if (!q) return [];
    const items = fuse.search(q).slice(0, 6).map((r) => r.item);
    // Nothing left to suggest once the input already IS the only match.
    if (items.length === 1 && items[0].toLowerCase() === q.toLowerCase()) return [];
    return items;
  }, [value, fuse]);
  const showList = open && suggestions.length > 0;

  function pick(s: string) {
    onChange(s);
    setOpen(false);
    setHighlight(-1);
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        {prefix && (
          <span className="flex items-center rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 text-sm text-emerald-300">
            {prefix} ✓
          </span>
        )}
        <input
          autoFocus
          role="combobox"
          aria-label={label}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && highlight >= 0 ? `${listId}-${highlight}` : undefined}
          autoComplete="off"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, -1));
            } else if (e.key === "Escape") {
              setOpen(false);
              setHighlight(-1);
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (showList && highlight >= 0) {
                pick(suggestions[highlight]);
              } else {
                setOpen(false);
                onSubmit();
              }
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-[var(--panel)] px-4 py-3 outline-none focus:border-[var(--gold)]"
        />
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-[var(--panel)]"
        >
          {suggestions.map((s, i) => (
            <li
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === highlight}
              // mousedown + preventDefault keeps focus in the input (no blur-close race)
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-4 py-2 ${i === highlight ? "bg-white/10" : ""}`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Result({
  date,
  reveal,
  solvedCropIndex,
  stats,
  streak,
  score,
  shareText,
  copyState,
  onShare,
}: {
  date: string;
  reveal: Reveal | null;
  solvedCropIndex: number | null;
  stats: Stats;
  streak: number;
  score: number | null;
  shareText: string;
  copyState: "idle" | "copied" | "failed";
  onShare: () => void;
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

      {score !== null && (
        <p className="text-center text-sm text-[var(--muted)]">
          Horology Score <span className="text-lg font-bold text-[var(--ink)]">{score}</span>
          <br />
          Earlier crops and rarer watches score more.
        </p>
      )}

      <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-[var(--panel)] p-4 text-center text-lg leading-snug select-all">
        {shareText}
      </pre>

      <button
        onClick={onShare}
        className="rounded-lg bg-[var(--gold)] px-4 py-3 font-semibold text-black transition hover:brightness-110"
      >
        {copyState === "copied"
          ? "Copied!"
          : copyState === "failed"
            ? "Copy blocked: select the text above"
            : "Share result"}
      </button>

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <Stat label="Streak" value={streak} />
        <Stat label="Max" value={stats.maxStreak} />
        <Stat
          label="Win %"
          value={stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}
        />
      </div>

      <Countdown date={date} solvedToday={reveal?.solvedToday ?? null} />
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

/** Ticks against the real clock, so a restored game shows the right time too. */
function Countdown({ date, solvedToday }: { date: string; solvedToday: number | null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (todayKey(now) !== date) {
    return (
      <p className="text-center text-sm text-[var(--muted)]">
        A new watch is out.{" "}
        <button onClick={() => location.reload()} className="text-[var(--gold)] underline">
          Play it →
        </button>
      </p>
    );
  }

  const s = secondsUntilNext(now);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <p className="text-center text-sm text-[var(--muted)]">
      {solvedToday !== null && <>{solvedToday.toLocaleString()} solved today · </>}
      next watch in {hh}:{mm}:{ss}
    </p>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center text-[var(--muted)]">{children}</div>
  );
}
