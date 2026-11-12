import { Suspense } from "react";
import type { Metadata } from "next";
import { safeRedirect } from "@/lib/safe-redirect";
import { Logo } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

async function Form({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  return <SignInForm next={safeRedirect(next)} />;
}

export default function SignInPage(props: PageProps<"/sign-in">) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96" />
      <header className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pt-[8vh] pb-16">
        <div className="w-full max-w-sm animate-rise">
          <Suspense fallback={<div className="card skeleton h-80" />}>
            <Form {...props} />
          </Suspense>
          <p className="mt-6 text-center text-xs text-muted">Only club admins need to sign in. Members can view their board with a club code.</p>
        </div>
      </main>
    </div>
  );
}
