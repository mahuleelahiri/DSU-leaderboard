"use client";

import { KeyRound } from "lucide-react";
import { CopyButton } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/Dialog";

export type NewCredentials = { email: string; password: string } | null;

/**
 * Shows a newly generated admin password once, right after the invite. It is
 * also emailed to the person, but this lets the inviter pass it on directly.
 */
export function CredentialsDialog({ credentials, onClose }: { credentials: NewCredentials; onClose: () => void }) {
  return (
    <Dialog
      open={credentials !== null}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          <KeyRound size={16} className="text-brand" /> Sign-in details
        </span>
      }
      description="We've emailed these to them. This is the only time the password is shown here."
    >
      {credentials && (
        <div className="space-y-3">
          {(
            [
              ["Email", credentials.email],
              ["Password", credentials.password],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <p className="label">{label}</p>
              <div className="flex items-center gap-2">
                <code className="input flex h-10 flex-1 items-center overflow-x-auto font-mono text-sm select-all">{value}</code>
                <CopyButton value={value} />
              </div>
            </div>
          ))}
          <p className="text-xs text-muted">They can change it after signing in, under Account.</p>
          <div className="flex justify-end pt-1">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
