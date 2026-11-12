import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Inbox, ShieldCheck, Users } from "lucide-react";
import { listViewerClubs } from "@/lib/admin-data";
import { requireViewer } from "@/lib/dal";
import { timeAgo } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { PageSkeleton } from "@/components/dashboard/PageSkeleton";

const denials: Record<string, string> = {
  club: "You don’t have access to that club.",
  platform: "Platform admin access is required for that page.",
};

async function ClubList({ searchParams }: PageProps<"/dashboard">) {
  const viewer = await requireViewer("/dashboard");
  const { denied } = await searchParams;
  const clubs = await listViewerClubs(viewer.id, viewer.isSuperAdmin);

  return (
    <>
      <PageHeader
        eyebrow={`Welcome back, ${viewer.name.split(" ")[0]}`}
        title="Your clubs"
        description={viewer.isSuperAdmin ? "As a platform admin you can open any club." : "Clubs where you are an owner or editor."}
        actions={
          viewer.isSuperAdmin && (
            <Link href="/admin" className="btn btn-secondary">
              <ShieldCheck size={16} /> Platform admin
            </Link>
          )
        }
      />
      {typeof denied === "string" && denials[denied] && <p className="mb-6 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">{denials[denied]}</p>}

      {clubs.length === 0 ? (
        <div className="card">
          <EmptyState icon={Building2} title="No clubs yet">
            {viewer.isSuperAdmin ? "Create the first club from the platform admin area." : "When a club owner adds your email to their team, the club will appear here."}
          </EmptyState>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <li key={club.id}>
              <Link href={`/dashboard/${club.id}`} className="card group flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-lg font-semibold text-brand-soft-ink">{club.name.charAt(0).toUpperCase()}</span>
                  <span className={club.role === "owner" ? "badge badge-brand" : club.role ? "badge" : "badge badge-warn"}>{club.role ?? "platform"}</span>
                </div>
                <h2 className="mt-4 font-semibold tracking-tight">{club.name}</h2>
                {club.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{club.description}</p>}
                <div className="mt-auto flex items-center gap-4 pt-5 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Users size={13} /> {club.memberCount}
                  </span>
                  {club.pendingRequests > 0 && (
                    <span className="flex items-center gap-1 font-medium text-brand">
                      <Inbox size={13} /> {club.pendingRequests} pending
                    </span>
                  )}
                  <span className="ml-auto">{club.lastActivity ? `Active ${timeAgo(club.lastActivity)}` : "No activity yet"}</span>
                  <ArrowRight size={14} className="text-line-strong transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function DashboardHome(props: PageProps<"/dashboard">) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Suspense fallback={<PageSkeleton />}>
        <ClubList {...props} />
      </Suspense>
    </main>
  );
}
