import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: process.env.BETTER_AUTH_SECRET ?? "change-me-in-production",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
  },
  plugins: [
    nextCookies(),
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      disableSignUp: false,
      allowedAttempts: 3,
      rateLimit: { window: 60, max: 5 },
      sendVerificationOTP: async ({ email, otp, type }) => {
        const from = process.env.RESEND_FROM_EMAIL ?? "Clubhouse <no-reply@localhost>";
        await resend.emails.send({
          from,
          to: email,
          subject: "Your Clubhouse sign-in code",
          html: `
            <div style="font-family: sans-serif; line-height: 1.5;">
              <h2>Clubhouse sign-in</h2>
              <p>Your 6-digit code for ${type} is:</p>
              <p style="font-size: 2rem; font-weight: 700; letter-spacing: 0.25rem; margin: 1rem 0;">${otp}</p>
              <p>This code expires in 5 minutes.</p>
            </div>
          `,
        });
      },
    }),
  ],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});
