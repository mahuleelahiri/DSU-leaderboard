import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { countPendingRequests } from "@/lib/admin-data";
import { requireClubPage } from "@/lib/dal";
import { SideNav, type NavItem } from "@/components/dashboard/nav";
import { PageSkeleton } from "@/components/dashboard/PageSkeleton";

async function ClubSidebar({ params }: { params: LayoutProps<"/dashboard/[clubId]">["params"] }) {
  const { clubId } = await params;
  const access = await requireClubPage(clubId);
  const pending = await countPendingRequests(clubId);
  const base = `/dashboard/${clubId}`;
  const items: NavItem[] = [
    { href: base, label: "Overview", icon: "overview", exact: true },
    { href: `${base}/marks`, label: "Marks", icon: "marks" },
    { href: `${base}/members`, label: "Members", icon: "members" },
    { href: `${base}/requests`, label: "Join requests", icon: "requests", badge: pending },
    { href: `${base}/domains`, label: "Domains", icon: "domains" },
    { href: `${base}/seasons`, label: "Seasons", icon: "seasons" },
    { href: `${base}/team`, label: "Team", icon: "team" },
    { href: `${base}/settings`, label: "Settings", icon: "settings" },
  ];
  return (
    <>
      <div className="mb-4 hidden lg:block">
        <p className="truncate font-semibold tracking-tight">{access.club.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          <span className="capitalize">{access.viaPlatform ? "Platform admin" : access.role}</span>·
          <Link href={`/c/${access.club.accessCode}`} target="_blank" className="inline-flex items-center gap-1 hover:text-brand">
            Public board <ExternalLink size={11} />
          </Link>
        </p>
      </div>
      <SideNav items={items} />
    </>
  );
}

export default function ClubLayout({ children, params }: LayoutProps<"/dashboard/[clubId]">) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-10 lg:py-10">
      <aside className="lg:sticky lg:top-24 lg:h-fit lg:w-56 lg:shrink-0">
        <Suspense fallback={<div className="skeleton h-10 lg:h-80" />}>
          <ClubSidebar params={params} />
        </Suspense>
      </aside>
      <main className="min-w-0 flex-1">
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </main>
    </div>
  );
}
