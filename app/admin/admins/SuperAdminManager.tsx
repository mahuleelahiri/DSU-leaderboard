"use client";

import { useRef } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { addSuperAdmin, removeSuperAdmin } from "@/app/_actions/platform";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmButton, Spinner } from "@/components/ui/buttons";
import { useAction } from "@/components/ui/use-action";

type Admin = { userId: string; email: string; name: string; createdAt: string };

export function SuperAdminManager({ viewerId, admins }: { viewerId: string; admins: Admin[] }) {
  const [pending, run] = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        className="card flex flex-col gap-2 p-4 sm:flex-row"
        action={async (form) => {
          const ok = await run(() => addSuperAdmin({ email: String(form.get("email") ?? "") }));
          if (ok !== null) formRef.current?.reset();
        }}
      >
        <input name="email" type="email" className="input" placeholder="name@gmail.com" required aria-label="Email" />
        <button className="btn btn-primary" disabled={pending}>
          {pending ? <Spinner /> : <><ShieldCheck size={15} /> Grant access</>}
        </button>
      </form>
      <ul className="card divide-y divide-line">
        {admins.map((a) => (
          <Row key={a.userId} admin={a} isSelf={a.userId === viewerId} />
        ))}
      </ul>
    </div>
  );
}

function Row({ admin, isSelf }: { admin: Admin; isSelf: boolean }) {
  const [pending, run] = useAction();
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar name={admin.name || admin.email} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {admin.name || admin.email} {isSelf && <span className="text-xs font-normal text-muted">(you)</span>}
        </p>
        <p className="truncate text-xs text-muted">
          {admin.email} · since {formatDate(admin.createdAt)}
        </p>
      </div>
      {!isSelf && (
        <ConfirmButton className="btn btn-danger-ghost btn-sm" confirmLabel="Revoke?" pending={pending} onConfirm={() => void run(() => removeSuperAdmin({ userId: admin.userId }))}>
          <Trash2 size={14} />
        </ConfirmButton>
      )}
    </li>
  );
}
