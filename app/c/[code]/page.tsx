import { Suspense } from "react";
import ClubLeaderboard from "./ClubLeaderboard";

async function ClubRouteContent({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ClubLeaderboard key={code} code={code} />;
}

export default function ClubRoute({ params }: { params: Promise<{ code: string }> }) {
  return <Suspense fallback={<div className="club-loading">Opening leaderboard…</div>}><ClubRouteContent params={params} /></Suspense>;
}