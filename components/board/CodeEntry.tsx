"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, History, KeyRound } from "lucide-react";
import { isValidAccessCode, normalizeAccessCode } from "@/lib/access-code";
import { Spinner } from "@/components/ui/buttons";

const KEY = "clubhouse-last-club";
const noop = () => () => {};

function readLast() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as { code: string; name: string }) : null;
  } catch {
    return null;
  }
}

/** Remembered on the public board so returning visitors get a shortcut. */
export function rememberClub(code: string, name: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, name }));
  } catch {}
}

export function CodeEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [navigating, setNavigating] = useState(false);
  const lastRaw = useSyncExternalStore(noop, () => localStorage.getItem(KEY), () => null);
  const last = lastRaw ? readLast() : null;

  useEffect(() => {
    if (isValidAccessCode(code)) router.prefetch(`/c/${code}`);
  }, [code, router]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidAccessCode(code)) {
      setError("Codes are 6 characters, letters and numbers (no 0, 1, I or O).");
      return;
    }
    setNavigating(true);
    router.push(`/c/${code}`);
  }

  return (
    <div className="card relative overflow-hidden p-6 shadow-card sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-soft-ink">
          <KeyRound size={18} />
        </span>
        <div>
          <h2 className="font-semibold tracking-tight">Open your club’s board</h2>
          <p className="text-sm text-muted">Enter the 6-character code from your club admin.</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <label htmlFor="club-code" className="sr-only">
          Club code
        </label>
        <input
          id="club-code"
          className="input tabular h-14 text-center font-mono text-2xl font-semibold tracking-[0.4em] uppercase placeholder:tracking-[0.4em]"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          maxLength={6}
          placeholder="ABC123"
          value={code}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "code-error" : undefined}
          onChange={(event) => {
            setCode(normalizeAccessCode(event.target.value));
            setError("");
          }}
        />
        {error && (
          <p id="code-error" role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={code.length !== 6 || navigating}>
          {navigating ? <Spinner /> : <>View leaderboard <ArrowRight size={16} /></>}
        </button>
      </form>
      {last && isValidAccessCode(last.code) && (
        <Link href={`/c/${last.code}`} className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-sm text-ink-2 transition-colors hover:border-brand hover:text-ink">
          <History size={15} className="text-muted" />
          <span className="min-w-0 flex-1 truncate">
            Continue to <strong className="font-semibold">{last.name}</strong>
          </span>
          <span className="font-mono text-xs text-muted">{last.code}</span>
        </Link>
      )}
      <p className="mt-5 border-t border-line pt-4 text-xs text-muted">No account needed to view a board. Codes can be rotated by club owners at any time.</p>
    </div>
  );
}
