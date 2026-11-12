import { Suspense } from "react";
import type { Metadata } from "next";
import { TopBar } from "@/components/dashboard/TopBar";
import { SideNav } from "@/components/dashboard/nav";
import { PageSkeleton } from "@/components/dashboard/PageSkeleton";

export const metadata: Metadata = { title: { default: "Platform admin", template: "%s · Platform · Clubhouse" }, robots: { index: false } };

export default function PlatformLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar section="Platform" />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-10 lg:py-10">
        <aside className="lg:sticky lg:top-24 lg:h-fit lg:w-56 lg:shrink-0">
          <p className="eyebrow mb-3 hidden lg:block">Platform</p>
          <SideNav
            items={[
              { href: "/admin", label: "Clubs", icon: "clubs", exact: true },
              { href: "/admin/admins", label: "Platform admins", icon: "admins" },
              { href: "/admin/audit", label: "Audit log", icon: "audit" },
            ]}
          />
        </aside>
        <main className="min-w-0 flex-1">
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
