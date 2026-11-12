"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/utils";

type Point = { day: string; marks: number; entries: number };

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const parse = (day: string) => new Date(`${day}T00:00:00`);

/**
 * Single-series column chart of marks awarded per day (last 30 days).
 * One hue, rounded data-ends on a shared baseline, recessive grid, per-bar
 * hover tooltip, and an equivalent table for screen readers.
 */
export function ActivityChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.marks));
  const niceMax = niceCeil(max);
  const ticks = [0, niceMax / 2, niceMax];
  const total = data.reduce((sum, d) => sum + d.marks, 0);
  const active = hover !== null ? data[hover] : null;

  return (
    <figure className="m-0">
      <figcaption className="mb-4 flex items-baseline justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold">Marks awarded per day</span>
          <span className="text-xs text-muted">Last 30 days · positive awards only</span>
        </span>
        <span className="tabular text-right text-sm">
          {active ? (
            <>
              <span className="font-semibold">{formatNumber(active.marks)}</span> <span className="text-muted">on {dayLabel.format(parse(active.day))}</span>
            </>
          ) : (
            <>
              <span className="font-semibold">{formatNumber(total)}</span> <span className="text-muted">total</span>
            </>
          )}
        </span>
      </figcaption>

      <div className="relative h-44" aria-hidden>
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(t / niceMax) * 100}%` }}>
            <span className="tabular w-8 shrink-0 -translate-y-1/2 text-right text-[10px] text-muted">{formatNumber(t)}</span>
            <span className={`h-px flex-1 ${t === 0 ? "bg-line-strong" : "bg-line"}`} />
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-10 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <div key={d.day} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
              <div
                className="w-full rounded-t-[4px] bg-brand transition-opacity"
                style={{ height: d.marks > 0 ? `max(2px, ${(d.marks / niceMax) * 100}%)` : 0, opacity: hover === null || hover === i ? 1 : 0.35 }}
              />
              {hover === i && (
                <div className="card pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 px-2.5 py-1.5 text-xs whitespace-nowrap shadow-pop">
                  <p className="font-medium">{dayLabel.format(parse(d.day))}</p>
                  <p className="tabular text-muted">
                    {formatNumber(d.marks)} marks · {d.entries} award{d.entries === 1 ? "" : "s"}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 ml-10 flex justify-between text-[10px] text-muted" aria-hidden>
        <span>{dayLabel.format(parse(data[0].day))}</span>
        <span>{dayLabel.format(parse(data[Math.floor(data.length / 2)].day))}</span>
        <span>Today</span>
      </div>

      <table className="sr-only">
        <caption>Marks awarded per day, last 30 days</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Marks</th>
            <th>Awards</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.marks}</td>
              <td>{d.entries}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function niceCeil(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

/** Horizontal single-series bars for domain totals, labelled directly. */
export function DomainBars({ rows }: { rows: { id: string; name: string; marks: number; members: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.marks));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} title={`${r.name}: ${formatNumber(r.marks)} marks across ${r.members} active members`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{r.name}</span>
            <span className="tabular shrink-0 text-muted">
              <span className="font-semibold text-ink">{formatNumber(r.marks)}</span> · {r.members} members
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(0, (r.marks / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
