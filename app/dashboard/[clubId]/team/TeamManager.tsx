"use client";

import { useRef } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { addClubAdmin, changeAdminRole, removeClubAdmin } from "@/app/_actions/club";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmButton, Spinner } from "@/components/ui/buttons";
import { useAction } from "@/components/ui/use-action";

type Admin = { userId: string; name: string; email: string; role: "owner" | "editor"; createdAt: string; lastSeen: string | null };

export function TeamManager({ clubId, viewerId, admins, canManage }: { clubId: string; viewerId: string; admins: Admin[]; canManage: boolean }) {
  const [pending, run] = useAction();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-6">
      {canManage && (
        <form
          ref={formRef}
          className="card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
          action={async (form) => {
            const ok = await run(() =>
              addClubAdmin({ clubId, email: String(form.get("email") ?? ""), name: String(form.get("name") ?? ""), role: form.get("role") === "owner" ? "owner" : "editor" }),
            );
            if (ok !== null) formRef.current?.reset();
          }}
        >
          <div>
            <label className="label" htmlFor="t-email">
              Email
            </label>
            <input id="t-email" name="email" type="email" className="input" placeholder="name@gmail.com" required />
          </div>
          <div>
            <label className="label" htmlFor="t-name">
              Display name
            </label>
            <input id="t-name" name="name" className="input" placeholder="Shown on awards" required maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="t-role">
              Role
            </label>
            <select id="t-role" name="role" className="input" defaultValue="editor">
              <option value="editor">Editor</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={pending}>
            {pending ? <Spinner /> : <><UserPlus size={15} /> Invite</>}
          </button>
          <p className="text-xs text-muted sm:col-span-4">Any address works, personal or college. They’ll get an email and sign in with a one-time code, with no password to share.</p>
        </form>
      )}

      <ul className="card divide-y divide-line">
        {admins.map((a) => (
          <AdminRow key={a.userId} clubId={clubId} admin={a} isSelf={a.userId === viewerId} canManage={canManage} />
        ))}
      </ul>
    </div>
  );
}

function AdminRow({ clubId, admin, isSelf, canManage }: { clubId: string; admin: Admin; isSelf: boolean; canManage: boolean }) {
  const [pending, run] = useAction();
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Avatar name={admin.name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {admin.name} {isSelf && <span className="text-xs font-normal text-muted">(you)</span>}
        </p>
        <p className="truncate text-xs text-muted">
          {admin.email} · {admin.lastSeen ? `last active ${timeAgo(admin.lastSeen)}` : "hasn’t signed in yet"}
        </p>
      </div>
      {canManage ? (
        <>
          <select
            className="input h-8 w-auto text-xs"
            value={admin.role}
            disabled={pending}
            aria-label={`Role for ${admin.name}`}
            onChange={(e) => void run(() => changeAdminRole({ clubId, userId: admin.userId, role: e.target.value as Admin["role"] }))}
          >
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
          </select>
          <ConfirmButton className="btn btn-danger-ghost btn-sm" confirmLabel={isSelf ? "Leave club?" : "Remove?"} pending={pending} onConfirm={() => void run(() => removeClubAdmin({ clubId, userId: admin.userId }))}>
            <Trash2 size={14} />
          </ConfirmButton>
        </>
      ) : (
        <span className={admin.role === "owner" ? "badge badge-brand" : "badge"}>{admin.role}</span>
      )}
    </li>
  );
}
