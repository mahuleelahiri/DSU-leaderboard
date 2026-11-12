import type { Metadata } from "next";
import { listClubAdmins } from "@/lib/admin-data";
import { hasRole, requireClubPage } from "@/lib/dal";
import { PageHeader } from "@/components/ui/misc";
import { TeamManager } from "./TeamManager";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ params }: PageProps<"/dashboard/[clubId]/team">) {
  const { clubId } = await params;
  const access = await requireClubPage(clubId);
  const admins = await listClubAdmins(clubId);
  return (
    <>
      <PageHeader title="Team" description="Owners manage everything including settings and the team. Editors can award marks and manage members, domains and requests." />
      <TeamManager
        clubId={clubId}
        viewerId={access.viewer.id}
        canManage={hasRole(access, "owner")}
        admins={admins.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), lastSeen: a.lastSeen ? new Date(a.lastSeen).toISOString() : null }))}
      />
    </>
  );
}
