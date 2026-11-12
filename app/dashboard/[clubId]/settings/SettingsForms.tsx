"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { regenerateAccessCode, updateClubSettings } from "@/app/_actions/club";
import { ConfirmButton, CopyButton, Spinner } from "@/components/ui/buttons";
import { Field } from "@/components/ui/misc";
import { useAction } from "@/components/ui/use-action";

export function ClubSettingsForm({ clubId, initial, disabled }: { clubId: string; initial: { name: string; description: string; allowJoinRequests: boolean }; disabled: boolean }) {
  const [pending, run] = useAction();
  return (
    <form
      className="card space-y-4 p-5"
      action={async (form) => {
        await run(() =>
          updateClubSettings({ clubId, name: String(form.get("name") ?? ""), description: String(form.get("description") ?? ""), allowJoinRequests: form.get("allowJoinRequests") === "on" }),
        );
      }}
    >
      <h2 className="font-semibold">Club profile</h2>
      <fieldset disabled={disabled} className="space-y-4">
        <Field label="Club name" htmlFor="c-name">
          <input id="c-name" name="name" className="input" required maxLength={80} defaultValue={initial.name} />
        </Field>
        <Field label="Description" htmlFor="c-desc" hint="Shown under the club name on the public board.">
          <textarea id="c-desc" name="description" className="input" rows={3} maxLength={280} defaultValue={initial.description} />
        </Field>
        <label className="flex items-start gap-3 rounded-xl border border-line p-3">
          <input type="checkbox" name="allowJoinRequests" defaultChecked={initial.allowJoinRequests} className="mt-0.5 size-4 accent-[var(--brand)]" />
          <span>
            <span className="block text-sm font-medium">Accept join requests</span>
            <span className="block text-xs text-muted">Shows a “Join” button on the public board.</span>
          </span>
        </label>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? <Spinner /> : "Save changes"}
        </button>
      </fieldset>
    </form>
  );
}

export function AccessCodeCard({ clubId, code, canRotate }: { clubId: string; code: string; canRotate: boolean }) {
  const [pending, run] = useAction();
  return (
    <section className="card flex flex-col p-5">
      <h2 className="font-semibold">Access code</h2>
      <p className="mt-1 text-sm text-muted">Anyone with this code can view the board. Rotate it if it’s shared too widely.</p>
      <div className="my-5 flex items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface-2 py-6">
        <span className="tabular font-mono text-4xl font-semibold tracking-[0.3em]">{code}</span>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <CopyButton value={code} label="Copy code" />
        <CopyButton value={typeof window === "undefined" ? `/c/${code}` : `${window.location.origin}/c/${code}`} label="Copy link" />
        <Link href={`/c/${code}`} target="_blank" className="btn btn-ghost btn-sm">
          Open <ExternalLink size={13} />
        </Link>
        {canRotate && (
          <ConfirmButton className="btn btn-danger-ghost btn-sm ml-auto" confirmLabel="Old code stops working — confirm" pending={pending} onConfirm={() => void run(() => regenerateAccessCode({ clubId }))}>
            <RefreshCw size={14} /> Rotate
          </ConfirmButton>
        )}
      </div>
    </section>
  );
}
