import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { findClubIdByCode } from "@/lib/club-data";

/** Legacy URL: /c/CODE/admin → the club's dashboard (auth enforced there). */
async function Forward({ params }: PageProps<"/c/[code]/admin">): Promise<never> {
  const { code } = await params;
  const clubId = await findClubIdByCode(code);
  if (!clubId) notFound();
  return redirect(`/dashboard/${clubId}`);
}

export default function LegacyClubAdmin(props: PageProps<"/c/[code]/admin">) {
  return (
    <Suspense>
      <Forward {...props} />
    </Suspense>
  );
}
