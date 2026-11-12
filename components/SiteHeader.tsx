import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          {children}
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Clubhouse · Good things add up.</p>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="hover:text-ink">
            Admin sign in
          </Link>
          <ThemeToggle className="sm:hidden" />
        </div>
      </div>
    </footer>
  );
}
