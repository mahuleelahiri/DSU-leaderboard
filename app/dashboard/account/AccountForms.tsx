"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ShieldCheck, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/buttons";
import { Field } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toaster";

type Club = { id: string; name: string; role: string };

function friendly(message?: string, status?: number) {
  const lower = (message ?? "").toLowerCase();
  if (status === 429 || lower.includes("too many")) return "Too many attempts. Please wait a minute.";
  if (lower.includes("already in use")) return "That email is already linked to another Clubhouse account.";
  if (lower.includes("same")) return "That's already your sign-in email.";
  if (lower.includes("expired")) return "That code has expired. Request a new one.";
  if (lower.includes("invalid")) return "That code isn't right. Check the email and try again.";
  return message || "Something went wrong. Please try again.";
}

export function AccountForms({ name, email, isSuperAdmin, clubs }: { name: string; email: string; isSuperAdmin: boolean; clubs: Club[] }) {
  return (
    <div className="space-y-6">
      <ProfileCard name={name} />
      <EmailCard email={email} />
      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShieldCheck size={16} className="text-brand" /> Access
        </h2>
        <p className="mt-1 text-sm text-muted">These stay with your account if you change your email.</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {isSuperAdmin && <li className="badge badge-brand">Platform admin</li>}
          {clubs.map((c) => (
            <li key={c.id} className="badge">
              {c.name} · {c.role}
            </li>
          ))}
          {!isSuperAdmin && clubs.length === 0 && <li className="text-sm text-muted">No club roles yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function ProfileCard({ name }: { name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const next = value.trim().replace(/\s+/g, " ");
    if (!next || next.length > 80) return toast.error("Enter a name up to 80 characters.");
    setBusy(true);
    const { error } = await authClient.updateUser({ name: next });
    setBusy(false);
    if (error) return toast.error(friendly(error.message, error.status));
    toast.success("Name updated.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="card space-y-4 p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <User size={16} className="text-brand" /> Profile
      </h2>
      <Field label="Display name" htmlFor="acc-name" hint="Shown in the dashboard. Each club can also set the name shown on your awards.">
        <input id="acc-name" className="input" value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} required />
      </Field>
      <button className="btn btn-primary" disabled={busy || value.trim() === name}>
        {busy ? <Spinner /> : "Save"}
      </button>
    </form>
  );
}

function EmailCard({ email }: { email: string }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function request(event?: React.FormEvent) {
    event?.preventDefault();
    setError("");
    const address = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError("Enter a valid email address.");
    if (address === email.toLowerCase()) return setError("That's already your sign-in email.");
    setBusy(true);
    const { error: err } = await authClient.emailOtp.requestEmailChange({ newEmail: address });
    setBusy(false);
    if (err) return setError(friendly(err.message, err.status));
    setStep("code");
    setOtp("");
  }

  async function confirm(code: string) {
    setError("");
    setBusy(true);
    const { error: err } = await authClient.emailOtp.changeEmail({ newEmail: newEmail.trim().toLowerCase(), otp: code });
    setBusy(false);
    if (err) {
      setOtp("");
      return setError(friendly(err.message, err.status));
    }
    toast.success(`You'll now sign in with ${newEmail.trim().toLowerCase()}.`);
    setStep("idle");
    setNewEmail("");
    router.refresh();
  }

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Mail size={16} className="text-brand" /> Sign-in email
      </h2>
      <p className="mt-1 text-sm text-muted">
        You currently sign in with <strong className="font-medium text-ink">{email}</strong>. Switch to a personal address if you’ll lose access to your college inbox.
      </p>

      {step === "idle" ? (
        <form onSubmit={request} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="acc-email" className="sr-only">
            New email
          </label>
          <input id="acc-email" type="email" className="input" placeholder="you@gmail.com" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
          <button className="btn btn-secondary shrink-0" disabled={busy || !newEmail}>
            {busy ? <Spinner /> : "Send code"}
          </button>
        </form>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (otp.length === 6) void confirm(otp);
          }}
        >
          <p className="text-sm">
            Enter the 6-digit code sent to <strong>{newEmail.trim().toLowerCase()}</strong>. If nothing arrives, that address may already belong to another account.
          </p>
          <input
            className="input tabular h-12 max-w-48 text-center font-mono text-xl font-semibold tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            aria-label="Confirmation code"
            value={otp}
            disabled={busy}
            autoFocus
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setOtp(value);
              if (value.length === 6) void confirm(value);
            }}
          />
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy || otp.length !== 6}>
              {busy ? <Spinner /> : "Confirm new email"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setStep("idle"); setError(""); }}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">For your security, we’ll notify your current address when the change goes through.</p>
    </section>
  );
}
