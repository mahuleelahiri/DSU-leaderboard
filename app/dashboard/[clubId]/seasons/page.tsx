import type { Metadata } from "next";
import { listSeasons } from "@/lib/admin-data";
import { hasRole, requireClubPage } from "@/lib/dal";
import { toDateInput } from "@/lib/utils";
import { PageHeader } from "@/components/ui/misc";
import { SeasonsManager } from "./SeasonsManager";

export const metadata: Metadata = { title: "Seasons" };

export default async function SeasonsPage({ params }: PageProps<"/dashboard/[clubId]/seasons">) {
  const { clubId } = await params;
  const access = await requireClubPage(clubId);
  const seasons = await listSeasons(clubId);
  return (
    <>
      <PageHeader title="Seasons" description="Marks are tallied per season. Switching the current season starts a fresh leaderboard while keeping history browsable." />
      <SeasonsManager
        clubId={clubId}
        canManage={hasRole(access, "owner")}
        seasons={seasons.map((s) => ({ ...s, startDate: toDateInput(s.startDate), endDate: toDateInput(s.endDate) }))}
      />
    </>
  );
}
