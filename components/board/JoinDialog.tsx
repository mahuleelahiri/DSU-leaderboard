"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { submitJoinRequest } from "@/app/_actions/public";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/misc";
import { Spinner } from "@/components/ui/buttons";
import { useAction } from "@/components/ui/use-action";

export function JoinDialog({ open, onClose, code, clubName, domains }: { open: boolean; onClose: () => void; code: string; clubName: string; domains: { id: string; name: string }[] }) {
  const [pending, run] = useAction();
  const [done, setDone] = useState(false);

  function close() {
    onClose();
    window.setTimeout(() => setDone(false), 200);
  }

  async function submit(form: FormData) {
    const result = await run(
      () =>
        submitJoinRequest({
          code,
          name: String(form.get("name") ?? ""),
          domainId: String(form.get("domainId") ?? ""),
          note: String(form.get("note") ?? ""),
          website: String(form.get("website") ?? ""),
        }),
      { silent: true },
    );
    if (result !== null) setDone(true);
  }

  return (
    <Dialog open={open} onClose={close} title={`Join ${clubName}`} description="An admin will review your request before you appear on the board.">
      {done ? (
        <div className="py-6 text-center">
          <CircleCheck size={40} className="mx-auto text-success" />
          <p className="mt-3 font-semibold">Request sent!</p>
          <p className="mt-1 text-sm text-muted">You’ll show up on the board once an admin approves it.</p>
          <button className="btn btn-secondary mt-6" onClick={close}>
            Done
          </button>
        </div>
      ) : (
        <form action={submit} className="space-y-4">
          <Field label="Your full name" htmlFor="join-name" hint="Use the name your club knows you by.">
            <input id="join-name" name="name" className="input" required maxLength={80} autoComplete="name" />
          </Field>
          <Field label="Domain" htmlFor="join-domain">
            <select id="join-domain" name="domainId" className="input" required defaultValue="">
              <option value="" disabled>
                Choose a domain…
              </option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note for admins (optional)" htmlFor="join-note">
            <textarea id="join-note" name="note" className="input" maxLength={280} rows={2} placeholder="e.g. 2nd year CSE, joined at the orientation" />
          </Field>
          {/* Honeypot for bots — hidden from people and assistive tech. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? <Spinner /> : "Send request"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
