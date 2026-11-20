"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/buttons";
import { friendlyAuthError } from "@/app/sign-in/SignInForm";

export function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError("Enter a valid email address.");
    setBusy(true);
    const { error: err } = await authClient.requestPasswordReset({ email: address, redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (err) return setError(friendlyAuthError(err));
    setSent(true);
  }

  return (
    <div className="card p-6 shadow-card sm:p-7">
      <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-soft-ink">{sent ? <MailCheck size={20} /> : <KeyRound size={20} />}</span>
      {sent ? (
        <>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="mt-1 text-sm text-muted">
            If <strong className="font-medium text-ink">{email.trim()}</strong> has a Clubhouse account, a reset link is on its way. It expires in 1 hour. Check spam if it doesn’t arrive.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Forgot your password?</h1>
          <p className="mt-1 text-sm text-muted">Enter your sign-in email and we’ll send you a link to choose a new one.</p>
          <form onSubmit={submit} className="mt-6 space-y-3" noValidate>
            <label htmlFor="email" className="label">
              Email address
            </label>
            <input id="email" type="email" className="input h-11" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <button className="btn btn-primary h-11 w-full" disabled={busy || !email}>
              {busy ? <Spinner /> : "Send reset link"}
            </button>
          </form>
        </>
      )}
      <Link href="/sign-in" className="btn btn-ghost btn-sm mt-4 -ml-2">
        <ArrowLeft size={14} /> Back to sign in
      </Link>
    </div>
  );
}
