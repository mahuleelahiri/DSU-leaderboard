"use client";

import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import type { MemberHistory, PublicMember } from "@/lib/club";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog } from "@/components/ui/Dialog";
import { MarksDelta } from "@/components/ui/misc";

type Loaded = { id: string; history: MemberHistory | null };
type State = { status: "loading" } | { status: "error" } | { status: "ready"; history: MemberHistory };

export function MemberDialog({ code, member, onClose }: { code: string; member: (PublicMember & { rank: number; domainName: string }) | null; onClose: () => void }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const memberId = member?.id;
  // Loading is derived: data is "ready" only when it belongs to the open member.
  const state: State =
    !loaded || loaded.id !== memberId ? { status: "loading" } : loaded.history ? { status: "ready", history: loaded.history } : { status: "error" };

  useEffect(() => {
    if (!memberId) return;
    const controller = new AbortController();
    fetch(`/api/club/${code}/members/${memberId}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((history: MemberHistory) => setLoaded({ id: memberId, history }))
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") setLoaded({ id: memberId, history: null });
      });
    return () => controller.abort();
  }, [code, memberId]);

  return (
    <Dialog open={Boolean(member)} onClose={onClose} title="Member history" size="md">
      {member && (
        <>
          <div className="flex items-center gap-4">
            <Avatar name={member.name} src={member.photoUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold tracking-tight">{member.name}</p>
              <p className="text-sm text-muted">
                {member.domainName}
                {state.status === "ready" && ` · joined ${formatDate(state.history.member.joinedDate)}`}
              </p>
            </div>
            <div className="text-right">
              <p className="tabular text-2xl font-semibold">{formatNumber(member.marks)}</p>
              <p className="text-xs text-muted">Rank #{member.rank}</p>
            </div>
          </div>

          {state.status === "loading" && (
            <div className="mt-6 space-y-2" aria-busy>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-12" />
              ))}
            </div>
          )}
          {state.status === "error" && <p className="mt-6 rounded-xl bg-danger-soft p-3 text-sm text-danger">Couldn’t load history. Please try again.</p>}
          {state.status === "ready" && (
            <>
              {state.history.seasonTotals.length > 1 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {state.history.seasonTotals.map((s) => (
                    <span key={s.seasonId} className={s.isCurrent ? "badge badge-brand" : "badge"}>
                      {s.seasonName}: <span className="tabular">{formatNumber(s.marks)}</span>
                    </span>
                  ))}
                </div>
              )}
              <h3 className="eyebrow mt-6 mb-2">Recent awards</h3>
              {state.history.entries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line-strong py-10 text-center text-sm text-muted">
                  <Award className="mx-auto mb-2 text-line-strong" size={22} />
                  No marks yet. Keep showing up!
                </div>
              ) : (
                <ol className="relative space-y-1 border-l border-line pl-4">
                  {state.history.entries.map((entry) => (
                    <li key={entry.id} className="relative rounded-xl px-3 py-2.5 hover:bg-surface-2">
                      <span className={`absolute top-4 -left-[21px] size-2.5 rounded-full ring-4 ring-surface ${entry.marks > 0 ? "bg-success" : "bg-danger"}`} />
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm">{entry.reason || <span className="text-muted italic">No reason given</span>}</p>
                        <MarksDelta value={entry.marks} className="shrink-0 text-sm" />
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatDateTime(entry.createdAt)} · {entry.seasonName}
                        {entry.givenBy && ` · by ${entry.givenBy}`}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </>
      )}
    </Dialog>
  );
}
