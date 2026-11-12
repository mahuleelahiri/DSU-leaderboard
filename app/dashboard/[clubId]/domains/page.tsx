import type { Metadata } from "next";
import { listDomains } from "@/lib/admin-data";
import { hasRole, requireClubPage } from "@/lib/dal";
import { PageHeader } from "@/components/ui/misc";
import { DomainsManager } from "./DomainsManager";

export const metadata: Metadata = { title: "Domains" };

export default async function DomainsPage({ params }: PageProps<"/dashboard/[clubId]/domains">) {
  const { clubId } = await params;
  const access = await requireClubPage(clubId);
  const domains = await listDomains(clubId);
  return (
    <>
      <PageHeader title="Domains" description="Groups within your club. Each domain gets its own ranking on the public board." />
      <DomainsManager clubId={clubId} canDelete={hasRole(access, "owner")} domains={domains.map((d) => ({ id: d.id, name: d.name, memberCount: d.memberCount, totalMembers: d.totalMembers, pendingRequests: d.pendingRequests }))} />
    </>
  );
}
