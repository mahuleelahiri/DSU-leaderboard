"use client";

import { useRef, useState } from "react";
import { Check, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { createDomain, deleteDomain, renameDomain } from "@/app/_actions/club";
import { ConfirmButton, Spinner } from "@/components/ui/buttons";
import { EmptyState } from "@/components/ui/misc";
import { useAction } from "@/components/ui/use-action";

type Domain = { id: string; name: string; memberCount: number; totalMembers: number; pendingRequests: number };

export function DomainsManager({ clubId, domains, canDelete }: { clubId: string; domains: Domain[]; canDelete: boolean }) {
  const [pending, run] = useAction();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="card overflow-hidden">
      <form
        ref={formRef}
        className="flex gap-2 border-b border-line p-3"
        action={async (form) => {
          const ok = await run(() => createDomain({ clubId, name: String(form.get("name") ?? "") }));
          if (ok !== null) formRef.current?.reset();
        }}
      >
        <input name="name" className="input h-9" placeholder="New domain, e.g. Photography" maxLength={50} required aria-label="Domain name" />
        <button className="btn btn-primary h-9" disabled={pending}>
          {pending ? <Spinner size={14} /> : <Plus size={15} />} Add
        </button>
      </form>
      {domains.length === 0 ? (
        <EmptyState icon={Layers} title="No domains yet">
          Create at least one domain before adding members.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {domains.map((d) => (
            <DomainRow key={d.id} clubId={clubId} domain={d} canDelete={canDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DomainRow({ clubId, domain, canDelete }: { clubId: string; domain: Domain; canDelete: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, run] = useAction();
  const blocked = domain.totalMembers > 0 || domain.pendingRequests > 0;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand-soft-ink">
        <Layers size={16} />
      </span>
      {editing ? (
        <form
          className="flex flex-1 gap-2"
          action={async (form) => {
            const ok = await run(() => renameDomain({ clubId, domainId: domain.id, name: String(form.get("name") ?? "") }));
            if (ok !== null) setEditing(false);
          }}
        >
          <input name="name" className="input h-9" defaultValue={domain.name} maxLength={50} required autoFocus aria-label="Domain name" />
          <button className="btn btn-primary btn-icon h-9 w-9" disabled={pending} aria-label="Save">
            {pending ? <Spinner size={14} /> : <Check size={15} />}
          </button>
          <button type="button" className="btn btn-ghost btn-icon h-9 w-9" onClick={() => setEditing(false)} aria-label="Cancel">
            <X size={15} />
          </button>
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{domain.name}</p>
            <p className="text-xs text-muted">
              {domain.memberCount} active member{domain.memberCount === 1 ? "" : "s"}
              {domain.totalMembers > domain.memberCount && ` · ${domain.totalMembers - domain.memberCount} inactive`}
              {domain.pendingRequests > 0 && ` · ${domain.pendingRequests} pending`}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(true)} aria-label={`Rename ${domain.name}`}>
            <Pencil size={14} />
          </button>
          {canDelete && (
            <ConfirmButton
              className="btn btn-danger-ghost btn-sm"
              confirmLabel="Delete?"
              disabled={blocked}
              title={blocked ? "Move its members and resolve pending requests first" : "Delete domain"}
              pending={pending}
              onConfirm={() => void run(() => deleteDomain({ clubId, domainId: domain.id }))}
            >
              <Trash2 size={14} />
            </ConfirmButton>
          )}
        </>
      )}
    </li>
  );
}
