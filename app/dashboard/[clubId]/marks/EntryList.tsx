"use client";

import { useState } from "react";
import { Award, Pencil, Trash2 } from "lucide-react";
import { deleteEntry, updateEntry } from "@/app/_actions/club";
import { formatDateTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmButton, Spinner } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState, Field, MarksDelta } from "@/components/ui/misc";
import { useAction } from "@/components/ui/use-action";

type Entry = {
  id: string;
  marks: number;
  reason: string | null;
  createdAt: string;
  updatedAt: string | null;
  givenByName: string | null;
  memberName: string;
  memberPhoto: string | null;
  domainName: string;
  seasonName: string;
};

export function EntryList({ clubId, entries, total }: { clubId: string; entries: Entry[]; total: number }) {
  const [editing, setEditing] = useState<Entry | null>(null);
  const [pending, run] = useAction();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <EmptyState icon={Award} title="No entries found">
        Try a different season or search term.
      </EmptyState>
    );
  }

  return (
    <>
      <p className="px-4 pt-3 text-xs text-muted">{total} entries</p>
      <ul className="divide-y divide-line">
        {entries.map((e) => (
          <li key={e.id} className="group flex items-center gap-3 px-4 py-3">
            <Avatar name={e.memberName} src={e.memberPhoto} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="font-medium">{e.memberName}</span> <span className="text-muted">· {e.domainName}</span>
              </p>
              <p className="truncate text-xs text-muted">
                {e.reason ?? <em>No reason</em>} · {formatDateTime(e.createdAt)}
                {e.givenByName && ` · by ${e.givenByName}`}
                {e.updatedAt && " · edited"}
              </p>
            </div>
            <MarksDelta value={e.marks} className="w-14 text-right text-sm" />
            <div className="flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <button className="btn btn-ghost btn-icon btn-sm" aria-label={`Edit entry for ${e.memberName}`} onClick={() => setEditing(e)}>
                <Pencil size={14} />
              </button>
              <ConfirmButton
                className="btn btn-danger-ghost btn-sm"
                confirmLabel="Delete?"
                pending={pending && deletingId === e.id}
                onConfirm={() => {
                  setDeletingId(e.id);
                  void run(() => deleteEntry({ clubId, entryId: e.id }));
                }}
              >
                <Trash2 size={14} />
              </ConfirmButton>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit entry" description={editing ? `${editing.memberName} · ${editing.seasonName}` : undefined} size="sm">
        {editing && (
          <form
            className="space-y-4"
            action={async (form) => {
              const ok = await run(() => updateEntry({ clubId, entryId: editing.id, marks: Number(form.get("marks")), reason: String(form.get("reason") ?? "") }));
              if (ok !== null) setEditing(null);
            }}
          >
            <Field label="Marks" htmlFor="edit-marks">
              <input id="edit-marks" name="marks" type="number" className="input tabular" defaultValue={editing.marks} required min={-1000} max={1000} />
            </Field>
            <Field label="Reason" htmlFor="edit-reason">
              <input id="edit-reason" name="reason" className="input" defaultValue={editing.reason ?? ""} maxLength={200} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={pending}>
                {pending ? <Spinner /> : "Save"}
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
