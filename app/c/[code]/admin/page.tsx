import { Suspense } from "react";
import ClubAdmin from "./ClubAdmin";

async function ClubAdminRouteContent({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ClubAdmin key={code} code={code} />;
}

export default function ClubAdminRoute({ params }: { params: Promise<{ code: string }> }) {
  return <Suspense fallback={<div className="club-loading">Checking admin access…</div>}><ClubAdminRouteContent params={params} /></Suspense>;
}