import "server-only";
import { Resend } from "resend";
import { env, isProduction } from "@/lib/env";
import { logger } from "@/lib/logger";

let client: Resend | null = null;

type Email = { to: string | string[]; subject: string; heading: string; body: string; cta?: { label: string; href: string } };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function render({ heading, body, cta }: Email) {
  const button = cta
    ? `<p style="margin:28px 0 8px"><a href="${escapeHtml(cta.href)}" style="background:#4f46e5;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f6;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827">
  <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb">
    <tr><td style="padding:32px">
      <p style="margin:0 0 20px;font-weight:700;font-size:15px;letter-spacing:-.01em">Clubhouse</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">${escapeHtml(heading)}</h1>
      <div style="font-size:15px;line-height:1.6;color:#374151">${body}</div>
      ${button}
    </td></tr>
  </table>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">You received this email because of activity on your Clubhouse account.</p>
</body></html>`;
}

/**
 * Sends a transactional email. Without RESEND_API_KEY (local development) the
 * message is printed to the server console instead, so the whole sign-in flow
 * works offline.
 */
export async function sendEmail(email: Email) {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL } = env();

  if (!RESEND_API_KEY) {
    if (isProduction) throw new Error("RESEND_API_KEY is required to send email in production.");
    logger.info("email.dev_outbox", { to: email.to, subject: email.subject, text: email.body.replace(/<[^>]+>/g, " ") });
    return;
  }

  client ??= new Resend(RESEND_API_KEY);
  const { error } = await client.emails.send({
    from: RESEND_FROM_EMAIL,
    to: email.to,
    subject: email.subject,
    html: render(email),
  });
  if (error) {
    // Resend accounts without a verified domain can only email the account
    // owner, which is the usual reason personal addresses get no code.
    const sandboxed = /testing emails|verify a domain|own email address/i.test(error.message);
    logger.error("email.send_failed", {
      subject: email.subject,
      error: error.message,
      hint: sandboxed ? "Resend is in test mode: verify a sending domain at resend.com/domains and set RESEND_FROM_EMAIL to an address on it, so codes reach any inbox (Gmail, Outlook…)." : undefined,
    });
    throw new Error("We couldn't send the email. Please try again shortly.");
  }
}

export function otpEmailBody(otp: string, purpose: "sign-in" | "change-email" = "sign-in") {
  const intro = purpose === "change-email" ? "Enter this code to make this address your Clubhouse sign-in email." : "Use this code to sign in.";
  return `<p>${intro} It expires in 5 minutes.</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:20px 0;font-family:ui-monospace,Menlo,monospace">${escapeHtml(otp)}</p>
  <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`;
}

export { escapeHtml };
