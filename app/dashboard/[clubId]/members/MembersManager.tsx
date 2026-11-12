"use client";

import { useMemo, useState } from "react";
import { Pencil, Search, Trash2, Upload, UserPlus, Users } from "lucide-react";
import { createMember, deleteMember, importMembers, updateMember } from "@/app/_actions/club";
import { cn, formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmButton, Spinner } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState, Field } from "@/components/ui/misc";
import { useAction } from "@/components/ui/use-action";

type Member = { id: string; name: string; photoUrl: string | null; active: boolean; domainId: string; domainName: string; joinedDate: string; marks: number; entries: number; lifetimeEntries: number };
type Domain = { id: string; name: string };

export function MembersManager({ clubId, members, domains, canDelete }: { clubId: string; members: Member[]; domains: Domain[]; canDelete: boolean }) {
  const [query, setQuery] = useState("");
  const [domainId, setDomainId] = useState("all");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [editing, setEditing] = useState<Member | "new" | null>(null);
  const [importing, setImporting] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => (domainId === "all" || m.domainId === domainId) && (status === "all" || (status === "active") === m.active) && (!q || m.name.toLowerCase().includes(q)));
  }, [members, query, domainId, status]);

  return (
    <>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative min-w-48 flex-1">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input className="input h-9 pl-9" placeholder="Search by name…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="input h-9 w-auto" value={domainId} onChange={(e) => setDomainId(e.target.value)} aria-label="Domain">
            <option value="all">All domains</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select className="input h-9 w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">Everyone</option>
          </select>
          <button className="btn btn-secondary h-9" onClick={() => setImporting(true)} disabled={domains.length === 0}>
            <Upload size={15} /> Import
          </button>
          <button className="btn btn-primary h-9" onClick={() => setEditing("new")} disabled={domains.length === 0}>
            <UserPlus size={15} /> Add member
          </button>
        </div>

        {domains.length === 0 ? (
          <EmptyState icon={Users} title="Create a domain first">
            Members belong to a domain. Add one under Domains, then come back.
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState icon={Users} title={members.length === 0 ? "No members yet" : "No one matches these filters"}>
            {members.length === 0 ? "Add members individually or import a list." : "Try clearing the search or filters."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th className="hidden md:table-cell">Domain</th>
                  <th className="text-right">Season marks</th>
                  <th className="hidden text-right sm:table-cell">Awards</th>
                  <th className="hidden lg:table-cell">Joined</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => (
                  <tr key={m.id} className={cn(!m.active && "opacity-60")}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} src={m.photoUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.name}</p>
                          <p className="truncate text-xs text-muted md:hidden">{m.domainName}</p>
                        </div>
                        {!m.active && <span className="badge">Inactive</span>}
                      </div>
                    </td>
                    <td className="hidden text-ink-2 md:table-cell">{m.domainName}</td>
                    <td className="tabular text-right font-semibold">{m.marks}</td>
                    <td className="tabular hidden text-right text-muted sm:table-cell">{m.entries}</td>
                    <td className="hidden text-muted lg:table-cell">{formatDate(m.joinedDate)}</td>
                    <td>
                      <div className="flex justify-end gap-0.5">
                        <button className="btn btn-ghost btn-icon btn-sm" aria-label={`Edit ${m.name}`} onClick={() => setEditing(m)}>
                          <Pencil size={14} />
                        </button>
                        {canDelete && <DeleteMember clubId={clubId} member={m} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MemberDialog clubId={clubId} domains={domains} member={editing} onClose={() => setEditing(null)} />
      <ImportDialog clubId={clubId} domains={domains} open={importing} onClose={() => setImporting(false)} />
    </>
  );
}

function DeleteMember({ clubId, member }: { clubId: string; member: Member }) {
  const [pending, run] = useAction();
  return (
    <ConfirmButton
      className="btn btn-danger-ghost btn-sm"
      confirmLabel="Delete?"
      title={member.lifetimeEntries > 0 ? `Also deletes ${member.lifetimeEntries} mark entries. Consider deactivating instead.` : "Delete permanently"}
      pending={pending}
      onConfirm={() => void run(() => deleteMember({ clubId, memberId: member.id }))}
    >
      <Trash2 size={14} />
    </ConfirmButton>
  );
}

function MemberDialog({ clubId, domains, member, onClose }: { clubId: string; domains: Domain[]; member: Member | "new" | null; onClose: () => void }) {
  const [pending, run] = useAction();
  const isNew = member === "new";
  const current = member && member !== "new" ? member : null;

  async function submit(form: FormData) {
    const base = { clubId, name: String(form.get("name") ?? ""), domainId: String(form.get("domainId") ?? ""), photoUrl: String(form.get("photoUrl") ?? "") };
    const result = current ? await run(() => updateMember({ ...base, memberId: current.id, active: form.get("active") === "on" })) : await run(() => createMember(base));
    if (result !== null) onClose();
  }

  return (
    <Dialog open={member !== null} onClose={onClose} title={isNew ? "Add member" : "Edit member"} size="sm">
      {member !== null && (
        <form action={submit} className="space-y-4" key={current?.id ?? "new"}>
          <Field label="Full name" htmlFor="m-name">
            <input id="m-name" name="name" className="input" required maxLength={80} defaultValue={current?.name} autoFocus />
          </Field>
          <Field label="Domain" htmlFor="m-domain">
            <select id="m-domain" name="domainId" className="input" required defaultValue={current?.domainId ?? domains[0]?.id}>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Photo URL (optional)" htmlFor="m-photo" hint="An https:// link to a square image.">
            <input id="m-photo" name="photoUrl" type="url" className="input" placeholder="https://…" defaultValue={current?.photoUrl ?? ""} maxLength={500} />
          </Field>
          {current && (
            <label className="flex items-start gap-3 rounded-xl border border-line p-3">
              <input type="checkbox" name="active" defaultChecked={current.active} className="mt-0.5 size-4 accent-[var(--brand)]" />
              <span>
                <span className="block text-sm font-medium">Active</span>
                <span className="block text-xs text-muted">Inactive members are hidden from the board and can’t receive marks.</span>
              </span>
            </label>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={pending}>
              {pending ? <Spinner /> : isNew ? "Add member" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function ImportDialog({ clubId, domains, open, onClose }: { clubId: string; domains: Domain[]; open: boolean; onClose: () => void }) {
  const [pending, run] = useAction();
  const [csv, setCsv] = useState("");
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await run(() => importMembers({ clubId, csv }));
    if (result) {
      setErrors(result.errors);
      if (result.errors.length === 0) {
        setCsv("");
        onClose();
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Import members" description="Paste one member per line as “Name, Domain”. Copying two columns from a spreadsheet works too." size="lg">
      <form onSubmit={submit} className="space-y-4">
        <textarea
          className="input font-mono text-[13px]"
          rows={10}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={`Name, Domain\nAarav Sharma, ${domains[0]?.name ?? "Design"}\nMeera Iyer, ${domains[1]?.name ?? domains[0]?.name ?? "Design"}`}
          required
        />
        <p className="text-xs text-muted">
          Domains in this club: {domains.map((d) => d.name).join(", ")}. Names that already exist are skipped.
        </p>
        {errors.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
            <p className="mb-1 font-semibold">Lines that weren’t imported</p>
            <ul className="space-y-0.5">
              {errors.map((e) => (
                <li key={`${e.line}-${e.message}`}>
                  Line {e.line}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" disabled={pending || !csv.trim()}>
            {pending ? <Spinner /> : "Import"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
