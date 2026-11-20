import type { Metadata } from "next";
import { safeRedirect } from "@/lib/safe-redirect";
import { AuthShell } from "@/components/AuthShell";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

async function Form({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  return <SignInForm next={safeRedirect(next)} />;
}

export default function SignInPage(props: PageProps<"/sign-in">) {
  return (
    <AuthShell footer="Only club admins need to sign in. Members can view their board with a club code.">
      <Form {...props} />
    </AuthShell>
  );
}
