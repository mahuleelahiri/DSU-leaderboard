import { Suspense } from "react";
import Link from "next/link";
import { Activity, Award, Building2, Inbox, Users, UsersRound } from "lucide-react";
import { getPlatformOverview } from "@/lib/admin-data";
import { requireSuperAdminPage } from "@/lib/dal";
import { formatNumber, timeAgo } from "@/lib/utils";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { CreateClubButton, DeleteClubButton } from "./PlatformForms";

export default function PlatformHome() {
  return (
    <>
      <PageHeader title="Clubs" description="Every club on the platform. Open one to manage it with owner rights." actions={<CreateClubButton />} />
      <Suspense fallback={<PlatformOverviewSkeleton />}>
        <PlatformOverview />
      </Suspense>
    </>
  );
}

function PlatformOverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading clubs">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-[106px] rounded-2xl" />
        ))}
      </div>
      <div className="skeleton mt-6 h-64 rounded-2xl" />
    </div>
  );
}

async function PlatformOverview() {
  await requireSuperAdminPage();
  const { totals, clubs } = await getPlatformOverview();

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clubs" value={totals.clubs} icon={Building2} />
        <StatCard label="Active members" value={totals.members} icon={Users} tone="success" />
        <StatCard label="Club admins" value={totals.admins} icon={UsersRound} tone="warn" />
        <StatCard label="Awards this week" value={totals.weekEntries} hint={`${formatNumber(totals.entries)} all time · ${totals.pending} pending requests`} icon={Activity} tone="gold" />
      </div>

      <section className="card mt-6 overflow-hidden">
        {clubs.length === 0 ? (
          <EmptyState icon={Building2} title="No clubs yet" action={<CreateClubButton />}>
            Create the first club and assign an owner by email.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Club</th>
                  <th>Code</th>
                  <th className="text-right">Members</th>
                  <th className="hidden text-right md:table-cell">Awards</th>
                  <th className="hidden lg:table-cell">Owners</th>
                  <th className="hidden sm:table-cell">Last activity</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {clubs.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/dashboard/${c.id}`} className="font-medium hover:text-brand">
                        {c.name}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/c/${c.accessCode}`} target="_blank" className="font-mono text-xs text-muted hover:text-brand">
                        {c.accessCode}
                      </Link>
                    </td>
                    <td className="tabular text-right">{c.memberCount}</td>
                    <td className="tabular hidden text-right md:table-cell">{formatNumber(c.entryCount)}</td>
                    <td className="hidden max-w-56 truncate text-xs text-muted lg:table-cell">{c.owners ?? <span className="text-warn">No owner</span>}</td>
                    <td className="hidden text-xs text-muted sm:table-cell">{c.lastActivity ? timeAgo(c.lastActivity) : "—"}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Link href={`/dashboard/${c.id}`} className="btn btn-ghost btn-sm">
                          Open
                        </Link>
                        <DeleteClubButton clubId={c.id} name={c.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
        <Award size={12} /> <Inbox size={12} /> Tip: assign owners when creating a club — they’ll receive an email with a sign-in link.
      </p>
    </>
  );
}
