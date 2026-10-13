"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";

function formatAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid or expired") || lower.includes("expired") || lower.includes("invalid otp") || lower.includes("invalid or expired token")) return "That code is invalid or has expired. Please request a new one.";
  if (lower.includes("rate limit") || lower.includes("too many requests")) return "Too many attempts. Please wait a minute and request a new code.";
  if (lower.includes("otp") || lower.includes("verification")) return "The 6-digit code is incorrect. Please check the email and try again.";
  return message;
}

export default function ClubAdmin({ code }: { code: string }) {
  const clubCode = String(code ?? "").trim().toUpperCase();
  const [status, setStatus] = useState<"loading" | "login" | "ready">("loading");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [notice, setNotice] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data, error } = await authClient.getSession();
      if (!active) return;
      if (error || !data?.user) {
        setStatus("login");
        return;
      }
      setStatus("ready");
      setNotice(`Signed in as ${data.user.email ?? "your account"}. The Neon admin data layer is still being connected for this club workspace.`);
    }

    void checkSession();
    return () => {
      active = false;
    };
  }, []);

  async function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    const nextEmail = email.trim().toLowerCase();

    if (!nextEmail) {
      setAuthError("Please enter your admin email.");
      return;
    }

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({ email: nextEmail, type: "sign-in" });
      if (result.error) {
        setAuthError(formatAuthError(result.error.message ?? "Unable to send the 6-digit code."));
        return;
      }
      setCodeSent(true);
      setOtpCode("");
      setNotice("A 6-digit code was sent to your email. Enter it below to sign in.");
    } catch (error) {
      setAuthError(error instanceof Error ? formatAuthError(error.message) : "Unable to send the 6-digit code right now.");
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    const nextEmail = email.trim().toLowerCase();
    const code = otpCode.trim();

    if (!nextEmail || code.length !== 6) {
      setAuthError("Enter the full 6-digit code sent to your email.");
      return;
    }

    try {
      const result = await authClient.signIn.emailOtp({
        email: nextEmail,
        otp: code,
      });

      if (result.error) {
        setAuthError(formatAuthError(result.error.message ?? "The 6-digit code is not valid."));
        return;
      }

      setStatus("ready");
      setCodeSent(false);
      setOtpCode("");
      setNotice(`Signed in as ${result.data?.user?.email ?? nextEmail}. The Neon admin data layer is still being connected for this club workspace.`);
    } catch (error) {
      setAuthError(error instanceof Error ? formatAuthError(error.message) : "Unable to verify the 6-digit code.");
    }
  }

  async function signOut() {
    await authClient.signOut();
    setStatus("login");
    setCodeSent(false);
    setOtpCode("");
    setNotice("");
    setAuthError("");
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <section className="login-panel">
          <div className="login-icon">
            <span>🔐</span>
          </div>
          <p className="eyebrow">CLUB ADMIN</p>
          {status === "loading" && <h1>Checking your sign-in…</h1>}
          {status === "login" && (
            <>
              <h1>Welcome back.</h1>
              <p className="intro-copy">Sign in to manage {clubCode || "this club"}.</p>
              {!codeSent ? (
                <form className="stack-form" onSubmit={(event) => void sendCode(event)}>
                  <label>
                    Email address
                    <input className="field" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                  </label>
                  <button className="button-primary" type="submit">
                    Send 6-digit code <ArrowRight size={16} />
                  </button>
                </form>
              ) : (
                <form className="stack-form" onSubmit={(event) => void verifyCode(event)}>
                  <label>
                    6-digit code
                    <input
                      className="field"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      placeholder="123456"
                    />
                  </label>
                  <button className="button-primary" type="submit">
                    Verify code
                  </button>
                  <button type="button" className="button-secondary" onClick={() => { setCodeSent(false); setOtpCode(""); setAuthError(""); }}>
                    Use a different email
                  </button>
                </form>
              )}
            </>
          )}
          {status === "ready" && (
            <>
              <h1>Admin access ready.</h1>
              <p className="intro-copy">
                Your Better Auth session is active. The club workspace data is still being reconnected to the Neon database layer.
              </p>
              <button className="button-secondary" type="button" onClick={() => void signOut()}>
                Sign out
              </button>
            </>
          )}
          {authError && <p className="error-copy">{authError}</p>}
          {notice && <p className="success-copy">{notice}</p>}
          <Link className="button-secondary" href={`/c/${encodeURIComponent(clubCode)}`}>
            Back to public board
          </Link>
        </section>
      </div>
    </main>
  );
}
