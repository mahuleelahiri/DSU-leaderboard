import Link from "next/link";
import { Compass } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
          <Compass size={24} />
        </span>
        <p className="eyebrow mt-6">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">This page doesn’t exist</h1>
        <p className="mt-2 text-muted">The link may be broken or the page may have moved.</p>
        <Link href="/" className="btn btn-primary mt-8">
          Back home
        </Link>
      </main>
    </div>
  );
}
