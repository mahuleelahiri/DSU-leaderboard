"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/buttons";

type AuthError = { message?: string; status?: number; code?: string };

/** Maps Better Auth error codes (not message text) to plain language. */
export function friendlyAuthError({ code, status, message }: AuthError) {
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (status && status >= 500) return "Sign-in is unavailable right now because the server hit an error (often the database is unreachable). Please try again shortly; if you run this app, check the server log.";
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Wrong email or password.";
    case "INVALID_EMAIL":
      return "Enter a valid email address.";
    case "INVALID_PASSWORD":
      return "Your current password isn't right.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 8 characters.";
    case "PASSWORD_TOO_LONG":
      return "Use at most 128 characters.";
    case "INVALID_TOKEN":
      return "This reset link is invalid or has expired. Request a new one.";
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return "Your account doesn't have a password yet. Sign out and use “Forgot password?” to set one.";
  }
  return message || "Something went wrong. Please try again.";
}

export function PasswordInput({ id, value, onChange, autoComplete, autoFocus }: { id: string; value: string; onChange: (value: string) => void; autoComplete: string; autoFocus?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={visible ? "text" : "password"} className="input h-11 pr-11" autoComplete={autoComplete} autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setBusy(true);
    const { error: err } = await authClient.signIn.email({ email: address, password });
    if (err) {
      setBusy(false);
      return setError(friendlyAuthError(err));
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="card p-6 shadow-card sm:p-7">
      <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-soft-ink">
        <LogIn size={20} />
      </span>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">Sign in to Clubhouse</h1>
      <p className="mt-1 text-sm text-muted">Admins sign in with the email and password they were given.</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input id="email" type="email" className="input h-11" autoComplete="username" autoFocus placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="label">
              Password
            </label>
            <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ""}`} className="text-xs font-medium text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button className="btn btn-primary h-11 w-full" disabled={busy || !email || !password}>
          {busy ? <Spinner /> : <>Sign in <ArrowRight size={16} /></>}
        </button>
      </form>
      <p className="mt-5 border-t border-line pt-4 text-xs text-muted">Access is invite-only. New admins receive their password by email when they’re added to a club.</p>
    </div>
  );
}
