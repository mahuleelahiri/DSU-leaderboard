import type { Metadata } from "next";
import { Suspense } from "react";
import { listViewerClubs } from "@/lib/admin-data";
import { requireViewer } from "@/lib/dal";
import { PageHeader } from "@/components/ui/misc";
import { PageSkeleton } from "@/components/dashboard/PageSkeleton";
import { AccountForms } from "./AccountForms";

export const metadata: Metadata = { title: "Account" };

async function Account() {
  const viewer = await requireViewer("/dashboard/account");
  const clubs = (await listViewerClubs(viewer.id, false)).map((c) => ({ id: c.id, name: c.name, role: c.role ?? "editor" }));
  return (
    <>
      <PageHeader title="Your account" description="Sign in with any email you like, whether it's college or personal (Gmail, Outlook, iCloud…). Your club roles stay attached to your account, not the address." />
      <AccountForms name={viewer.name} email={viewer.email} isSuperAdmin={viewer.isSuperAdmin} clubs={clubs} />
    </>
  );
}

export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Suspense fallback={<PageSkeleton />}>
        <Account />
      </Suspense>
    </main>
  );
}
