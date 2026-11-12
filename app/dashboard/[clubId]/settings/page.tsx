import type { Metadata } from "next";
import Link from "next/link";
import { listAuditLogs, listSeasons } from "@/lib/admin-data";
import { hasRole, requireClubPage } from "@/lib/dal";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, Pagination } from "@/components/ui/misc";
import { AccessCodeCard, ClubSettingsForm } from "./SettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params, searchParams }: PageProps<"/dashboard/[clubId]/settings">) {
  const [{ clubId }, sp] = await Promise.all([params, searchParams]);
  const access = await requireClubPage(clubId);
  const isOwner = hasRole(access, "owner");
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;
  const [audit, seasons] = await Promise.all([listAuditLogs(clubId, page), listSeasons(clubId)]);
  const { club } = access;

  return (
    <>
      <PageHeader title="Settings" description={isOwner ? "Manage how your club appears and who can reach it." : "Only owners can change settings; you can still export data and view the activity log."} />

      <div className="grid gap-6 xl:grid-cols-2">
        <ClubSettingsForm clubId={clubId} disabled={!isOwner} initial={{ name: club.name, description: club.description ?? "", allowJoinRequests: club.allowJoinRequests }} />
        <AccessCodeCard clubId={clubId} code={club.accessCode} canRotate={isOwner} />
      </div>

      <section className="card mt-6 p-5">
        <h2 className="font-semibold">Export data</h2>
        <p className="mt-1 text-sm text-muted">Download standings or every mark entry as a CSV that opens in Excel or Google Sheets.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {seasons.slice(0, 4).map((s) => (
            <div key={s.id} className="flex items-center gap-1 rounded-xl border border-line p-1 pl-3 text-sm">
              <span className="mr-1 font-medium">{s.name}</span>
              <a className="btn btn-ghost btn-sm" href={`/api/clubs/${clubId}/export?season=${s.id}`}>
                Standings
              </a>
              <a className="btn btn-ghost btn-sm" href={`/api/clubs/${clubId}/export?season=${s.id}&type=entries`}>
                Entries
              </a>
            </div>
          ))}
          {seasons.length === 0 && <p className="text-sm text-muted">Create a season first.</p>}
        </div>
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold">Activity log</h2>
          <p className="mt-0.5 text-sm text-muted">Every change made by your team, newest first.</p>
        </div>
        {audit.rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {audit.rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
                <span className="tabular w-36 shrink-0 text-xs text-muted">{formatDateTime(row.createdAt)}</span>
                <span className="min-w-0 flex-1 text-sm">{row.summary}</span>
                <span className="truncate text-xs text-muted">{row.actorEmail ?? "system"}</span>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={audit.page} pageCount={audit.pageCount} href={(p) => `?page=${p}`} />
      </section>

      {access.viaPlatform && (
        <p className="mt-6 text-sm text-muted">
          You’re viewing this club as a platform admin. Delete or reassign it from the <Link href="/admin" className="text-brand hover:underline">platform admin</Link> area.
        </p>
      )}
    </>
  );
}
