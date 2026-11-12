"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/buttons";

function friendlyError(message: string | undefined, status?: number) {
  const lower = (message ?? "").toLowerCase();
  if (status === 429 || lower.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  if (status && status >= 500) return "Sign-in is unavailable right now because the server hit an error (often the database is unreachable). Please try again shortly; if you run this app, check the server log.";
  if (lower.includes("expired")) return "That code has expired. Request a new one.";
  if (lower.includes("invalid") || lower.includes("otp")) return "That code isn't right. Check the email and try again.";
  return message || "Something went wrong. Please try again.";
}

const RESEND_SECONDS = 30;

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    setError("");
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError("Enter a valid email address.");
    setBusy(true);
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({ email: address, type: "sign-in" });
    setBusy(false);
    if (err) return setError(friendlyError(err.message, err.status));
    setStep("code");
    setOtp("");
    setCooldown(RESEND_SECONDS);
    window.setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function verify(code: string) {
    setError("");
    setBusy(true);
    const { error: err } = await authClient.signIn.emailOtp({ email: email.trim().toLowerCase(), otp: code });
    if (err) {
      setBusy(false);
      setOtp("");
      return setError(friendlyError(err.message, err.status));
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="card p-6 shadow-card sm:p-7">
      <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-soft-ink">{step === "email" ? <Mail size={20} /> : <ShieldCheck size={20} />}</span>

      {step === "email" ? (
        <>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Sign in to Clubhouse</h1>
          <p className="mt-1 text-sm text-muted">Use the email your club added: personal (Gmail, Outlook, iCloud…) or college. We’ll send a 6-digit code, no password needed.</p>
          <form onSubmit={sendCode} className="mt-6 space-y-3" noValidate>
            <label htmlFor="email" className="label">
              Email address
            </label>
            <input id="email" type="email" className="input h-11" autoComplete="email" autoFocus placeholder="you@gmail.com or you@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <button className="btn btn-primary h-11 w-full" disabled={busy || !email}>
              {busy ? <Spinner /> : <>Continue <ArrowRight size={16} /></>}
            </button>
          </form>
          <p className="mt-5 border-t border-line pt-4 text-xs text-muted">Access is invite-only. No code? Make sure it’s the exact address you were invited with, then check spam. Once signed in, you can switch to a personal email under Account.</p>
        </>
      ) : (
        <>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="mt-1 text-sm text-muted">
            If <strong className="font-medium text-ink">{email}</strong> has access, a code is on its way. It expires in 5 minutes.
          </p>
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (otp.length === 6) void verify(otp);
            }}
          >
            <label htmlFor="otp" className="label">
              6-digit code
            </label>
            <input
              ref={codeRef}
              id="otp"
              className="input tabular h-14 text-center font-mono text-2xl font-semibold tracking-[0.5em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              disabled={busy}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(value);
                if (value.length === 6) void verify(value);
              }}
            />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <button className="btn btn-primary h-11 w-full" disabled={busy || otp.length !== 6}>
              {busy ? <Spinner /> : "Verify and sign in"}
            </button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <button className="btn btn-ghost btn-sm -ml-2" onClick={() => { setStep("email"); setError(""); }}>
              <ArrowLeft size={14} /> Change email
            </button>
            <button className="btn btn-ghost btn-sm -mr-2" disabled={cooldown > 0 || busy} onClick={() => void sendCode()}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
