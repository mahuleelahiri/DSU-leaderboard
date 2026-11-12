"use client";

import Link from "next/link";
import { CircleAlert, RefreshCw } from "lucide-react";

export function ErrorPanel({ error, retry, home = "/" }: { error: Error & { digest?: string }; retry: () => void; home?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
        <CircleAlert size={24} />
      </span>
      <h1 className="mt-6 text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">This is usually temporary. Try again, and if it keeps happening, share the reference below with your platform admin.</p>
      {error.digest && <code className="mt-4 rounded-lg bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted">ref: {error.digest}</code>}
      <div className="mt-8 flex gap-2">
        <button className="btn btn-primary" onClick={() => retry()}>
          <RefreshCw size={15} /> Try again
        </button>
        <Link href={home} className="btn btn-secondary">
          Go back
        </Link>
      </div>
    </div>
  );
}
