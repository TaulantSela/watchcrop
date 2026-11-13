import { conversion, type DemandStats } from "@/lib/demand";

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

/**
 * The Phase 0 gate on one screen: signups, conversion, and which community
 * they came from. Tag posted links with ?utm_source=reddit&utm_campaign=…
 */
export function DemandPanel({ stats }: { stats: DemandStats }) {
  const week = stats.days.slice(-7).reduce(
    (a, d) => ({ visits: a.visits + d.visits, signups: a.signups + d.signups }),
    { visits: 0, signups: 0 },
  );
  const max = Math.max(1, ...stats.days.map((d) => d.visits));

  return (
    <section id="demand" className="mb-10 flex scroll-mt-6 flex-col gap-5 rounded-xl border border-white/10 bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-semibold">Demand (Phase 0)</h2>
        <a
          href="/api/admin/export"
          className="rounded border border-white/15 px-3 py-1.5 text-sm hover:border-white/40"
        >
          Export waitlist CSV
        </a>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          ["Waitlist", stats.totalSignups.toLocaleString()],
          ["Signups, 7 days", week.signups.toLocaleString()],
          ["Conversion, 7 days", pct(conversion(week))],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/10 py-3">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-[var(--muted)]">{label}</div>
          </div>
        ))}
      </div>
      {stats.flaggedBots > 0 && (
        <p className="text-xs text-[var(--muted)]">
          {stats.flaggedBots.toLocaleString()} more signup{stats.flaggedBots === 1 ? "" : "s"} flagged as
          bots by BotID: kept in the CSV (flagged_bot), left out of every number here.
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm text-[var(--muted)]">Last 14 days (visits · signups)</h3>
        <ul className="flex flex-col gap-1 text-xs">
          {stats.days.map((d) => (
            <li key={d.date} className="flex items-center gap-3">
              <span className="w-24 font-mono text-[var(--muted)]">{d.date}</span>
              <span className="h-2 rounded bg-[var(--gold)]/60" style={{ width: `${(d.visits / max) * 50}%` }} />
              <span className="whitespace-nowrap">
                {d.visits} · <strong>{d.signups}</strong>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm text-[var(--muted)]">By source, last 30 days</h3>
        {stats.sources.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No visits yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--muted)]">
              <tr>
                <th className="py-1 font-normal">Source</th>
                <th className="py-1 text-right font-normal">Visits</th>
                <th className="py-1 text-right font-normal">Signups</th>
                <th className="py-1 text-right font-normal">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.sources.map((s) => (
                <tr key={s.source}>
                  <td className="py-1.5">{s.source}</td>
                  <td className="py-1.5 text-right">{s.visits}</td>
                  <td className="py-1.5 text-right">{s.signups}</td>
                  <td className="py-1.5 text-right">{pct(conversion(s))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
