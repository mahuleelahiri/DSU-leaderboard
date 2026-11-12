"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Crown, Search, Share2, UserPlus, Users, Zap, Award, CalendarRange } from "lucide-react";
import type { PublicBoard, PublicMember } from "@/lib/club";
import { rankMembers } from "@/lib/ranking";
import { cn, formatDate, formatNumber, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/Toaster";
import { rememberClub } from "@/components/board/CodeEntry";
import { MemberDialog } from "@/components/board/MemberDialog";
import { JoinDialog } from "@/components/board/JoinDialog";

type Row = PublicMember & { rank: number; movement: number; domainName: string };

const REFRESH_MS = 60_000;

export function BoardView({ board }: { board: PublicBoard }) {
  const router = useRouter();
  const toast = useToast();
  const [domainId, setDomainId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [selected, setSelected] = useState<Row | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [, forceTick] = useState(0);

  const { club, season, seasons, domains, stats } = board;
  const domainNames = useMemo(() => new Map(domains.map((d) => [d.id, d.name])), [domains]);

  useEffect(() => rememberClub(club.accessCode, club.name), [club.accessCode, club.name]);

  // Keep the board fresh while the tab is visible.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(tick, REFRESH_MS);
    const clock = window.setInterval(() => forceTick((n) => n + 1), 15_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);

  const domainCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of board.members) counts.set(m.domainId, (counts.get(m.domainId) ?? 0) + 1);
    return counts;
  }, [board.members]);

  const ranked: Row[] = useMemo(() => {
    const pool = domainId === "all" ? board.members : board.members.filter((m) => m.domainId === domainId);
    const now = rankMembers(pool);
    const before = new Map(rankMembers(pool.map((m) => ({ ...m, marks: m.marks - m.recentMarks }))).map((m) => [m.id, m.rank]));
    return now.map((m) => ({ ...m, movement: (before.get(m.id) ?? m.rank) - m.rank, domainName: domainNames.get(m.domainId) ?? "" }));
  }, [board.members, domainId, domainNames]);

  const visible = deferredQuery ? ranked.filter((m) => m.name.toLowerCase().includes(deferredQuery)) : ranked;
  const podium = !deferredQuery && ranked.length > 0 && ranked[0].marks > 0 ? ranked.slice(0, 3) : [];

  async function share() {
    const url = `${window.location.origin}/c/${club.accessCode}`;
    try {
      if (navigator.share) await navigator.share({ title: `${club.name} leaderboard`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Board link copied to clipboard.");
      }
    } catch {
      /* user cancelled the share sheet */
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo compact />
            <span className="h-5 w-px bg-line-strong" />
            <span className="truncate text-sm font-semibold">{club.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <button className="btn btn-secondary btn-sm" onClick={share}>
              <Share2 size={14} /> <span className="hidden sm:inline">Share</span>
            </button>
            {club.allowJoinRequests && domains.length > 0 && (
              <button className="btn btn-primary btn-sm" onClick={() => setJoinOpen(true)}>
                <UserPlus size={14} /> Join
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
        <section className="animate-rise">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-success">
              <span className="size-1.5 animate-pulse rounded-full bg-success" /> Live
            </span>
            {seasons.length > 1 ? (
              <label className="relative inline-flex items-center">
                <span className="sr-only">Season</span>
                <CalendarRange size={12} className="pointer-events-none absolute left-2.5 text-muted" />
                <select
                  className="input h-7 rounded-full py-0 pl-7 text-xs font-semibold"
                  value={season?.id ?? ""}
                  onChange={(e) => router.push(`/c/${club.accessCode}?season=${e.target.value}`, { scroll: false })}
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.isCurrent ? " (current)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              season && <span className="badge">{season.name}</span>
            )}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">{club.name}</h1>
          {club.description && <p className="mt-3 max-w-2xl text-muted text-pretty">{club.description}</p>}
          {season && (
            <p className="mt-2 text-sm text-muted">
              {formatDate(season.startDate)} – {formatDate(season.endDate)}
              {!season.isCurrent && <span className="badge badge-warn ml-2">Past season</span>}
            </p>
          )}

          <dl className="mt-8 grid grid-cols-3 gap-3">
            {[
              { label: "Members", value: stats.activeMembers, icon: Users },
              { label: "Marks this season", value: stats.totalMarks, icon: Award },
              { label: "Scored this week", value: stats.scoringThisWeek, icon: Zap },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="card p-3.5 sm:p-4">
                <dt className="flex items-center gap-1.5 text-xs text-muted sm:text-[13px]">
                  <Icon size={13} className="hidden sm:block" /> {label}
                </dt>
                <dd className="tabular mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{formatNumber(value)}</dd>
              </div>
            ))}
          </dl>
        </section>

        {domains.length > 1 && (
          <nav aria-label="Domains" className="-mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex w-max gap-1.5 rounded-full border border-line bg-surface p-1">
              {[{ id: "all", name: "Overall" }, ...domains].map((d) => {
                const count = d.id === "all" ? board.members.length : (domainCounts.get(d.id) ?? 0);
                return (
                  <button
                    key={d.id}
                    onClick={() => setDomainId(d.id)}
                    aria-pressed={domainId === d.id}
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:text-ink",
                      domainId === d.id && "bg-ink text-bg hover:text-bg",
                    )}
                  >
                    {d.name}
                    <span className={cn("tabular text-xs opacity-60")}>{count}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {podium.length > 0 && <Podium rows={podium} onSelect={setSelected} />}

        <section className="card mt-6 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line p-3">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input className="input h-9 border-transparent bg-surface-2 pl-9" placeholder="Find a member…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search members" />
            </div>
            <span suppressHydrationWarning className="hidden text-xs text-muted sm:block">Updated {timeAgo(board.generatedAt)}</span>
          </div>

          {visible.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-muted">{query ? `No one matches “${query}”.` : "No members on this board yet."}</p>
          ) : (
            <ol>
              {visible.map((m) => (
                <li key={m.id} className="border-b border-line last:border-0">
                  <button onClick={() => setSelected(m)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2 sm:gap-4 sm:px-4">
                    <RankBadge rank={m.rank} />
                    <Movement value={m.movement} />
                    <Avatar name={m.name} src={m.photoUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{m.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {domainId === "all" && domains.length > 1 ? `${m.domainName} · ` : ""}
                        {m.entries === 0 ? "No awards yet" : `${m.entries} award${m.entries === 1 ? "" : "s"}`}
                        {m.recentMarks > 0 && <span className="text-success"> · +{m.recentMarks} this week</span>}
                      </span>
                    </span>
                    <span className="tabular text-right text-base font-semibold sm:text-lg">
                      {formatNumber(m.marks)}
                      <span className="ml-1 text-xs font-normal text-muted">pts</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
        <p className="mt-6 text-center text-xs text-muted">
          Tap a name to see how marks were earned · <Link className="underline-offset-2 hover:underline" href="/">Switch club</Link>
        </p>
      </main>

      <MemberDialog code={club.accessCode} member={selected} onClose={() => setSelected(null)} />
      <JoinDialog open={joinOpen} onClose={() => setJoinOpen(false)} code={club.accessCode} clubName={club.name} domains={domains} />
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medal = rank === 1 ? "bg-gold-soft text-gold" : rank === 2 ? "bg-silver-soft text-silver" : rank === 3 ? "bg-bronze-soft text-bronze" : "text-muted";
  return <span className={cn("tabular grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold", medal)}>{rank}</span>;
}

function Movement({ value }: { value: number }) {
  if (value === 0) return <span className="w-6 shrink-0 text-center text-xs text-line-strong" aria-label="No change">–</span>;
  return (
    <span className={cn("flex w-6 shrink-0 items-center justify-center text-xs font-semibold", value > 0 ? "text-success" : "text-danger")} aria-label={`${value > 0 ? "Up" : "Down"} ${Math.abs(value)} this week`}>
      <ArrowUp size={11} strokeWidth={3} className={value < 0 ? "rotate-180" : ""} />
      {Math.abs(value)}
    </span>
  );
}

function Podium({ rows, onSelect }: { rows: Row[]; onSelect: (row: Row) => void }) {
  // Visual order: 2nd, 1st, 3rd.
  const order = [rows[1], rows[0], rows[2]].filter(Boolean) as Row[];
  const styles: Record<number, { bar: string; ring: string; height: string }> = {
    1: { bar: "from-gold/25 to-gold/5 border-gold/40", ring: "ring-gold", height: "h-28 sm:h-32" },
    2: { bar: "from-silver/25 to-silver/5 border-silver/40", ring: "ring-silver", height: "h-20 sm:h-24" },
    3: { bar: "from-bronze/25 to-bronze/5 border-bronze/40", ring: "ring-bronze", height: "h-16 sm:h-20" },
  };
  return (
    <section aria-label="Top three" className="mt-8 grid grid-cols-3 items-end gap-2 sm:gap-4">
      {order.map((m) => {
        const s = styles[Math.min(m.rank, 3)];
        return (
          <button key={m.id} onClick={() => onSelect(m)} className="group flex min-w-0 animate-rise flex-col items-center text-center">
            <div className="relative">
              {m.rank === 1 && <Crown size={20} className="absolute -top-5 left-1/2 -translate-x-1/2 text-gold" fill="currentColor" />}
              <Avatar name={m.name} src={m.photoUrl} size={m.rank === 1 ? "xl" : "lg"} className={cn("ring-4 ring-offset-2 ring-offset-bg transition-transform group-hover:scale-105", s.ring)} />
            </div>
            <span className="mt-3 w-full truncate px-1 text-sm font-semibold">{m.name}</span>
            <span className="tabular text-xs text-muted">{formatNumber(m.marks)} pts</span>
            <div className={cn("mt-3 flex w-full items-start justify-center rounded-t-2xl border border-b-0 bg-gradient-to-b pt-2", s.bar, s.height)}>
              <span className="tabular text-2xl font-bold opacity-70">{m.rank}</span>
            </div>
          </button>
        );
      })}
    </section>
  );
}
