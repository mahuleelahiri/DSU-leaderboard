import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

async function Form({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;
  return <ResetPasswordForm token={typeof token === "string" && !error ? token : null} />;
}

export default function ResetPasswordPage(props: PageProps<"/reset-password">) {
  return (
    <AuthShell>
      <Form {...props} />
    </AuthShell>
  );
}
