import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Shared frame for the sign-in, forgot-password and reset-password pages. */
export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96" />
      <header className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pt-[8vh] pb-16">
        <div className="w-full max-w-sm animate-rise">
          <Suspense fallback={<div className="card skeleton h-80" />}>{children}</Suspense>
          {footer && <p className="mt-6 text-center text-xs text-muted">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
