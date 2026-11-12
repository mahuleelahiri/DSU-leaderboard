import Link from "next/link";
import { KeyRound } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

export default function ClubNotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-warn-soft text-warn">
          <KeyRound size={24} />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">That code doesn’t open a club</h1>
        <p className="mt-2 text-muted">Double-check the code with your club admin. Owners can rotate codes, so an old link may have stopped working.</p>
        <Link href="/" className="btn btn-primary mt-8">
          Try another code
        </Link>
      </main>
    </div>
  );
}
