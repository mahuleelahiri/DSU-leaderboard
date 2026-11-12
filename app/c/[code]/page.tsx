import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicBoard } from "@/lib/club-data";
import { BoardView } from "@/components/board/BoardView";
import { BoardSkeleton } from "@/components/board/BoardSkeleton";

export async function generateMetadata({ params }: PageProps<"/c/[code]">): Promise<Metadata> {
  const { code } = await params;
  const board = await getPublicBoard(code, null);
  if (!board) return { title: "Club not found", robots: { index: false } };
  return {
    title: `${board.club.name} leaderboard`,
    description: board.club.description ?? `Live standings for ${board.club.name}${board.season ? ` · ${board.season.name}` : ""}.`,
    // Boards are only reachable with a code; keep them out of search engines.
    robots: { index: false, follow: false },
  };
}

async function Board({ params, searchParams }: PageProps<"/c/[code]">) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const seasonId = typeof query.season === "string" ? query.season : null;
  const board = await getPublicBoard(code, seasonId);
  if (!board) notFound();
  return <BoardView board={board} />;
}

export default function ClubBoardPage(props: PageProps<"/c/[code]">) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Board {...props} />
    </Suspense>
  );
}
