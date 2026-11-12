import type { Metadata } from "next";
import { listSuperAdmins } from "@/lib/admin-data";
import { requireSuperAdminPage } from "@/lib/dal";
import { PageHeader } from "@/components/ui/misc";
import { SuperAdminManager } from "./SuperAdminManager";

export const metadata: Metadata = { title: "Platform admins" };

export default async function PlatformAdminsPage() {
  const viewer = await requireSuperAdminPage();
  const admins = await listSuperAdmins();
  return (
    <>
      <PageHeader title="Platform admins" description="Platform admins can create and delete clubs and act as an owner of any club. Keep this list short." />
      <SuperAdminManager viewerId={viewer.id} admins={admins.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))} />
    </>
  );
}
