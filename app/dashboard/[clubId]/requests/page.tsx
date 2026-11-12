import type { Metadata } from "next";
import Link from "next/link";
import { listDomains, listJoinRequests } from "@/lib/admin-data";
import { requireClubPage } from "@/lib/dal";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/misc";
import { RequestList } from "./RequestList";

export const metadata: Metadata = { title: "Join requests" };
const tabs = ["pending", "approved", "rejected"] as const;

export default async function RequestsPage({ params, searchParams }: PageProps<"/dashboard/[clubId]/requests">) {
  const [{ clubId }, sp] = await Promise.all([params, searchParams]);
  const access = await requireClubPage(clubId);
  const status = tabs.find((t) => t === sp.status) ?? "pending";
  const [requests, domains] = await Promise.all([listJoinRequests(clubId, status), listDomains(clubId)]);

  return (
    <>
      <PageHeader
        title="Join requests"
        description={access.club.allowJoinRequests ? "Visitors to your public board can ask to be added." : "Join requests are currently turned off in Settings."}
      />
      <nav className="mb-4 flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t}
            href={`?status=${t}`}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors", t === status ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink")}
          >
            {t}
          </Link>
        ))}
      </nav>
      <RequestList
        clubId={clubId}
        status={status}
        domains={domains.map((d) => ({ id: d.id, name: d.name }))}
        requests={requests.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), reviewedAt: r.reviewedAt?.toISOString() ?? null }))}
      />
    </>
  );
}
