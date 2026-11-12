"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClub, deleteClub } from "@/app/_actions/platform";
import { Spinner } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/misc";
import { useAction } from "@/components/ui/use-action";

export function CreateClubButton() {
  const [open, setOpen] = useState(false);
  const [pending, run] = useAction();

  async function submit(form: FormData) {
    const result = await run(() =>
      createClub({
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? ""),
        ownerEmail: String(form.get("ownerEmail") ?? ""),
        ownerName: String(form.get("ownerName") ?? ""),
        template: (form.get("template") as "creative" | "tech" | "blank") ?? "blank",
      }),
    );
    if (result) setOpen(false);
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={16} /> New club
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create a club" description="A unique access code and a 6-month season are created automatically.">
        <form action={submit} className="space-y-4">
          <Field label="Club name" htmlFor="cc-name">
            <input id="cc-name" name="name" className="input" required maxLength={80} autoFocus placeholder="e.g. Design Society" />
          </Field>
          <Field label="Description (optional)" htmlFor="cc-desc">
            <textarea id="cc-desc" name="description" className="input" rows={2} maxLength={280} />
          </Field>
          <Field label="Starting domains" htmlFor="cc-template">
            <select id="cc-template" name="template" className="input" defaultValue="creative">
              <option value="creative">Creative — Photography, Videography, Graphic Design, UI/UX, Illustration</option>
              <option value="tech">Tech — Web, App, AI/ML, Cybersecurity, Competitive Programming</option>
              <option value="blank">Blank — a single “General” domain</option>
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Owner email (optional)" htmlFor="cc-owner">
              <input id="cc-owner" name="ownerEmail" type="email" className="input" placeholder="owner@gmail.com" />
            </Field>
            <Field label="Owner name" htmlFor="cc-owner-name">
              <input id="cc-owner-name" name="ownerName" className="input" maxLength={80} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={pending}>
              {pending ? <Spinner /> : "Create club"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function DeleteClubButton({ clubId, name }: { clubId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, run] = useAction();
  return (
    <>
      <button className="btn btn-danger-ghost btn-icon btn-sm" aria-label={`Delete ${name}`} onClick={() => setOpen(true)}>
        <Trash2 size={14} />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Delete ${name}?`} description="This permanently removes the club, its members, seasons, marks and history. This cannot be undone." size="sm">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(() => deleteClub({ clubId, confirmName: confirm }));
            if (ok !== null) setOpen(false);
          }}
        >
          <Field label={`Type “${name}” to confirm`} htmlFor="del-confirm">
            <input id="del-confirm" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" disabled={pending || confirm.trim() !== name.trim()}>
              {pending ? <Spinner /> : "Delete club"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
