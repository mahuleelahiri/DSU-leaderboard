"use client";

import { useState } from "react";
import { CalendarRange, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { createSeason, deleteSeason, setCurrentSeason, updateSeason } from "@/app/_actions/club";
import { formatDate, formatNumber } from "@/lib/utils";
import { ConfirmButton, Spinner } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState, Field } from "@/components/ui/misc";
import { useAction } from "@/components/ui/use-action";

type Season = { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean; entryCount: number; totalMarks: number };

export function SeasonsManager({ clubId, seasons, canManage }: { clubId: string; seasons: Season[]; canManage: boolean }) {
  const [editing, setEditing] = useState<Season | "new" | null>(null);
  return (
    <>
      {canManage ? (
        <div className="mb-4 flex justify-end">
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            <Plus size={16} /> New season
          </button>
        </div>
      ) : (
        <p className="mb-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">Only club owners can create or change seasons.</p>
      )}
      {seasons.length === 0 ? (
        <div className="card">
          <EmptyState icon={CalendarRange} title="No seasons yet">
            Create your first season to start awarding marks.
          </EmptyState>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {seasons.map((s) => (
            <SeasonCard key={s.id} clubId={clubId} season={s} canManage={canManage} onEdit={() => setEditing(s)} />
          ))}
        </ul>
      )}
      <SeasonDialog clubId={clubId} season={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function SeasonCard({ clubId, season, canManage, onEdit }: { clubId: string; season: Season; canManage: boolean; onEdit: () => void }) {
  const [pending, run] = useAction();
  return (
    <li className={`card p-5 ${season.isCurrent ? "ring-2 ring-brand/40" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{season.name}</h3>
            {season.isCurrent && <span className="badge badge-brand">Current</span>}
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {formatDate(season.startDate)} – {formatDate(season.endDate)}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-0.5">
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} aria-label={`Edit ${season.name}`}>
              <Pencil size={14} />
            </button>
            {!season.isCurrent && (
              <ConfirmButton
                className="btn btn-danger-ghost btn-sm"
                confirmLabel="Delete?"
                disabled={season.entryCount > 0}
                title={season.entryCount > 0 ? "Seasons with mark entries are kept for history" : "Delete season"}
                pending={pending}
                onConfirm={() => void run(() => deleteSeason({ clubId, seasonId: season.id }))}
              >
                <Trash2 size={14} />
              </ConfirmButton>
            )}
          </div>
        )}
      </div>
      <dl className="mt-4 flex gap-6 text-sm">
        <div>
          <dt className="text-xs text-muted">Awards</dt>
          <dd className="tabular font-semibold">{formatNumber(season.entryCount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Total marks</dt>
          <dd className="tabular font-semibold">{formatNumber(season.totalMarks)}</dd>
        </div>
      </dl>
      {canManage && !season.isCurrent && (
        <button className="btn btn-secondary btn-sm mt-4" disabled={pending} onClick={() => void run(() => setCurrentSeason({ clubId, seasonId: season.id }))}>
          {pending ? <Spinner size={14} /> : <Star size={14} />} Make current
        </button>
      )}
    </li>
  );
}

function SeasonDialog({ clubId, season, onClose }: { clubId: string; season: Season | "new" | null; onClose: () => void }) {
  const [pending, run] = useAction();
  const current = season && season !== "new" ? season : null;
  const iso = (offsetMonths: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offsetMonths);
    return d.toISOString().slice(0, 10);
  };

  async function submit(form: FormData) {
    const data = { clubId, name: String(form.get("name") ?? ""), startDate: String(form.get("startDate")), endDate: String(form.get("endDate")) };
    const result = current ? await run(() => updateSeason({ ...data, seasonId: current.id })) : await run(() => createSeason({ ...data, makeCurrent: form.get("makeCurrent") === "on" }));
    if (result !== null) onClose();
  }

  return (
    <Dialog open={season !== null} onClose={onClose} title={current ? "Edit season" : "New season"} size="sm">
      {season !== null && (
        <form action={submit} className="space-y-4" key={current?.id ?? "new"}>
          <Field label="Name" htmlFor="s-name">
            <input id="s-name" name="name" className="input" required maxLength={60} defaultValue={current?.name ?? `Season ${iso(0).slice(0, 4)}`} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" htmlFor="s-start">
              <input id="s-start" name="startDate" type="date" className="input" required defaultValue={current?.startDate ?? iso(0)} />
            </Field>
            <Field label="Ends" htmlFor="s-end">
              <input id="s-end" name="endDate" type="date" className="input" required defaultValue={current?.endDate ?? iso(6)} />
            </Field>
          </div>
          {!current && (
            <label className="flex items-start gap-3 rounded-xl border border-line p-3">
              <input type="checkbox" name="makeCurrent" defaultChecked className="mt-0.5 size-4 accent-[var(--brand)]" />
              <span>
                <span className="block text-sm font-medium">Make this the current season</span>
                <span className="block text-xs text-muted">The public board will switch to it and new marks will go here.</span>
              </span>
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={pending}>
              {pending ? <Spinner /> : current ? "Save" : "Create season"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
