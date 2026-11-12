"use client";

import { useMemo, useState } from "react";
import { Check, Search, Sparkles } from "lucide-react";
import { awardMarks } from "@/app/_actions/club";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/buttons";
import { useAction } from "@/components/ui/use-action";

type Member = { id: string; name: string; photoUrl: string | null; domainId: string; marks: number };
const PRESETS = [5, 10, 25, 50, -5, -10];
const REASONS = ["Attended meetup", "Workshop host", "Event volunteer", "Project submission", "Competition win"];

export function AwardForm({ clubId, season, domains, members }: { clubId: string; season: { id: string; name: string } | null; domains: { id: string; name: string }[]; members: Member[] }) {
  const [pending, run] = useAction();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [domainId, setDomainId] = useState("all");
  const [query, setQuery] = useState("");
  const [marks, setMarks] = useState("10");
  const [reason, setReason] = useState("");

  const domainName = useMemo(() => new Map(domains.map((d) => [d.id, d.name])), [domains]);
  const visible = members.filter((m) => (domainId === "all" || m.domainId === domainId) && m.name.toLowerCase().includes(query.trim().toLowerCase()));
  const allVisibleSelected = visible.length > 0 && visible.every((m) => selected.has(m.id));
  const value = Number(marks);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisible() {
    setSelected((s) => {
      const next = new Set(s);
      for (const m of visible) {
        if (allVisibleSelected) next.delete(m.id);
        else next.add(m.id);
      }
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await run(() => awardMarks({ clubId, memberIds: [...selected], marks: value, reason }));
    if (result) {
      setSelected(new Set());
      setReason("");
    }
  }

  if (!season) {
    return <div className="card p-6 text-sm text-muted">Create a current season under <strong>Seasons</strong> to start awarding marks.</div>;
  }

  return (
    <form onSubmit={submit} className="card grid overflow-hidden lg:grid-cols-[1fr_320px]">
      <div className="flex min-h-0 flex-col border-b border-line lg:border-r lg:border-b-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative min-w-40 flex-1">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input className="input h-9 pl-9" placeholder="Search members…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="input h-9 w-auto" value={domainId} onChange={(e) => setDomainId(e.target.value)} aria-label="Filter by domain">
            <option value="all">All domains</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={toggleVisible} disabled={visible.length === 0}>
            {allVisibleSelected ? "Clear" : "Select"} {visible.length}
          </button>
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5" role="listbox" aria-multiselectable aria-label="Members">
          {visible.length === 0 && <li className="py-10 text-center text-sm text-muted">No members match.</li>}
          {visible.map((m) => {
            const on = selected.has(m.id);
            return (
              <li key={m.id} role="option" aria-selected={on}>
                <button type="button" onClick={() => toggle(m.id)} className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2", on && "bg-brand-soft hover:bg-brand-soft")}>
                  <span className={cn("grid size-4.5 shrink-0 place-items-center rounded-[5px] border", on ? "border-brand bg-brand text-brand-ink" : "border-line-strong")}>{on && <Check size={12} strokeWidth={3} />}</span>
                  <Avatar name={m.name} src={m.photoUrl} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                  <span className="hidden text-xs text-muted sm:inline">{domainName.get(m.domainId)}</span>
                  <span className="tabular w-10 text-right text-xs text-muted">{m.marks}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-4 bg-surface-2/50 p-4">
        <div>
          <p className="eyebrow">Awarding in {season.name}</p>
          <p className="mt-1 text-sm">
            <span className="tabular text-2xl font-semibold">{selected.size}</span> <span className="text-muted">member{selected.size === 1 ? "" : "s"} selected</span>
          </p>
        </div>
        <div>
          <label className="label" htmlFor="marks">
            Marks
          </label>
          <input id="marks" type="number" className="input tabular" min={-1000} max={1000} step={1} required value={marks} onChange={(e) => setMarks(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setMarks(String(p))} className={cn("badge cursor-pointer tabular hover:ring-1 hover:ring-line-strong", Number(marks) === p && (p > 0 ? "badge-success" : "badge-danger"))}>
                {p > 0 ? `+${p}` : `−${Math.abs(p)}`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="reason">
            Reason <span className="font-normal text-muted">(shown publicly)</span>
          </label>
          <input id="reason" className="input" maxLength={200} list="reason-suggestions" placeholder="What was it for?" value={reason} onChange={(e) => setReason(e.target.value)} />
          <datalist id="reason-suggestions">
            {REASONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
        <button className="btn btn-primary mt-auto w-full" disabled={pending || selected.size === 0 || !Number.isInteger(value) || value === 0}>
          {pending ? (
            <Spinner />
          ) : (
            <>
              <Sparkles size={15} /> Award {Number.isInteger(value) && value !== 0 ? (value > 0 ? `+${value}` : `−${Math.abs(value)}`) : ""} to {selected.size || "…"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
