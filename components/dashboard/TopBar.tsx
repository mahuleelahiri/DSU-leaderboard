import { Suspense } from "react";
import Link from "next/link";
import { getViewer } from "@/lib/dal";
import { Logo } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserMenu } from "@/components/dashboard/nav";

async function ViewerMenu() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <Link href="/sign-in" className="btn btn-primary btn-sm">
        Sign in
      </Link>
    );
  }
  return <UserMenu name={viewer.name} email={viewer.email} isSuperAdmin={viewer.isSuperAdmin} />;
}

export function TopBar({ section }: { section: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo href="/dashboard" compact />
          <span className="text-line-strong">/</span>
          <span className="text-sm font-semibold">{section}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Suspense fallback={<div className="skeleton size-8 rounded-full" />}>
            <ViewerMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
