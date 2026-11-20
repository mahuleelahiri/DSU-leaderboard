import { PageSkeleton } from "@/components/dashboard/PageSkeleton";

/**
 * Wraps every club page in its own Suspense boundary below the club layout.
 * The layout stays mounted when moving between club pages, so a boundary
 * inside the layout wouldn't cover those navigations; this one does, keeping
 * them instant (the skeleton shows while the page's session/data streams in).
 */
export default function ClubPageLoading() {
  return <PageSkeleton />;
}
