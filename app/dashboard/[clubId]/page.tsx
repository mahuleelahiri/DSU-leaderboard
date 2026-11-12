import Link from "next/link";
import { Activity, ArrowRight, Award, Download, Inbox, Users } from "lucide-react";
import { getClubOverview } from "@/lib/admin-data";
import { requireClubPage } from "@/lib/dal";
import { formatDate, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, MarksDelta, PageHeader, StatCard } from "@/components/ui/misc";
import { ActivityChart, DomainBars } from "@/components/dashboard/ActivityChart";

export default async function ClubOverview({ params }: PageProps<"/dashboard/[clubId]">) {
  const { clubId } = await params;
  const access = await requireClubPage(clubId);
  const o = await getClubOverview(clubId);
  const base = `/dashboard/${clubId}`;

  return (
    <>
      <PageHeader
        eyebrow={o.season ? `${o.season.name} · ends ${formatDate(o.season.endDate)}` : "No current season"}
        title={access.club.name}
        description="A snapshot of how your club is doing this season."
        actions={
          <>
            <a href={`/api/clubs/${clubId}/export`} className="btn btn-secondary">
              <Download size={16} /> Export CSV
            </a>
            <Link href={`${base}/marks`} className="btn btn-primary">
              <Award size={16} /> Award marks
            </Link>
          </>
        }
      />

      {!o.season && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-sm text-warn sm:flex-row sm:items-center sm:justify-between">
          <span>There’s no current season, so marks can’t be awarded yet.</span>
          <Link href={`${base}/seasons`} className="btn btn-secondary btn-sm">
            Set up a season
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active members" value={o.stats.activeMembers} hint={`${o.stats.totalMembers - o.stats.activeMembers} inactive`} icon={Users} />
        <StatCard label="Marks this season" value={o.stats.totalMarks} hint={`${o.stats.entries} awards`} icon={Award} tone="gold" />
        <StatCard label="Awards this week" value={o.stats.weekEntries} hint="Last 7 days" icon={Activity} tone="success" />
        <StatCard
          label="Pending requests"
          value={o.stats.pendingRequests}
          hint={o.stats.pendingRequests ? <Link href={`${base}/requests`} className="text-brand hover:underline">Review now →</Link> : "All caught up"}
          icon={Inbox}
          tone="warn"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <ActivityChart data={o.series} />
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Top this season</h2>
          {o.top.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No members yet.</p>
          ) : (
            <ol className="mt-3 space-y-1">
              {o.top.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                  <span className="tabular w-4 text-xs font-semibold text-muted">{i + 1}</span>
                  <Avatar name={m.name} src={m.photoUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{m.name}</span>
                    <span className="block truncate text-xs text-muted">{m.domainName}</span>
                  </span>
                  <span className="tabular text-sm font-semibold">{m.marks}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Marks by domain</h2>
          {o.domainTotals.length === 0 ? <p className="text-sm text-muted">No domains yet.</p> : <DomainBars rows={o.domainTotals} />}
        </section>
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <Link href={`${base}/marks`} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {o.recent.length === 0 ? (
            <EmptyState icon={Award} title="No marks awarded yet">
              Awards you give will show up here and on the public board.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {o.recent.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={e.memberName} src={e.memberPhoto} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{e.memberName}</span>
                      {e.reason && <span className="text-muted"> · {e.reason}</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {timeAgo(e.createdAt)}
                      {e.givenByName && ` · by ${e.givenByName}`}
                    </p>
                  </div>
                  <MarksDelta value={e.marks} className="text-sm" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
