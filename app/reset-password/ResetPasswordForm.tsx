"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, TriangleAlert } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/buttons";
import { useToast } from "@/components/ui/Toaster";
import { friendlyAuthError, PasswordInput } from "@/app/sign-in/SignInForm";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <div className="card p-6 shadow-card sm:p-7">
        <span className="grid size-11 place-items-center rounded-xl bg-warn-soft text-warn">
          <TriangleAlert size={20} />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">This link has expired</h1>
        <p className="mt-1 text-sm text-muted">Reset links work once and expire after 1 hour. Request a new one.</p>
        <Link href="/forgot-password" className="btn btn-primary mt-6 h-11 w-full">
          Request a new link
        </Link>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    const { error: err } = await authClient.resetPassword({ newPassword: password, token: token! });
    setBusy(false);
    if (err) return setError(friendlyAuthError(err));
    toast.success("Password updated. Sign in with your new password.");
    router.replace("/sign-in");
  }

  return (
    <div className="card p-6 shadow-card sm:p-7">
      <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-soft-ink">
        <KeyRound size={20} />
      </span>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted">At least 8 characters. You’ll be signed out everywhere else.</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="new-password" className="label">
            New password
          </label>
          <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" autoFocus />
        </div>
        <div>
          <label htmlFor="confirm-password" className="label">
            Confirm password
          </label>
          <PasswordInput id="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button className="btn btn-primary h-11 w-full" disabled={busy || !password || !confirm}>
          {busy ? <Spinner /> : "Save password"}
        </button>
      </form>
    </div>
  );
}
