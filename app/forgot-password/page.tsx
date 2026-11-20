import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

async function Form({ searchParams }: PageProps<"/forgot-password">) {
  const { email } = await searchParams;
  return <ForgotPasswordForm initialEmail={typeof email === "string" ? email : ""} />;
}

export default function ForgotPasswordPage(props: PageProps<"/forgot-password">) {
  return (
    <AuthShell>
      <Form {...props} />
    </AuthShell>
  );
}
