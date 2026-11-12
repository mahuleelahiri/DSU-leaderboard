import type { Metadata } from "next";
import { listDomains, listMembersWithMarks } from "@/lib/admin-data";
import { hasRole, requireClubPage } from "@/lib/dal";
import { PageHeader } from "@/components/ui/misc";
import { MembersManager } from "./MembersManager";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({ params }: PageProps<"/dashboard/[clubId]/members">) {
  const { clubId } = await params;
  const access = await requireClubPage(clubId);
  const [members, domains] = await Promise.all([listMembersWithMarks(clubId, "current"), listDomains(clubId)]);

  return (
    <>
      <PageHeader title="Members" description={`${members.filter((m) => m.active).length} active · ${members.filter((m) => !m.active).length} inactive. Inactive members are hidden from the public board but keep their history.`} />
      <MembersManager
        clubId={clubId}
        canDelete={hasRole(access, "owner")}
        domains={domains.map((d) => ({ id: d.id, name: d.name }))}
        members={members.map((m) => ({ ...m, joinedDate: m.joinedDate.toISOString() }))}
      />
    </>
  );
}
