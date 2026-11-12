import type { Metadata } from "next";
import { Search } from "lucide-react";
import { listDomains, listEntries, listMembersWithMarks, listSeasons, type SeasonRef } from "@/lib/admin-data";
import { requireClubPage } from "@/lib/dal";
import { PageHeader, Pagination } from "@/components/ui/misc";
import { AwardForm } from "./AwardForm";
import { EntryList } from "./EntryList";

export const metadata: Metadata = { title: "Marks" };

export default async function MarksPage({ params, searchParams }: PageProps<"/dashboard/[clubId]/marks">) {
  const [{ clubId }, sp] = await Promise.all([params, searchParams]);
  await requireClubPage(clubId);
  const str = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : null);
  const requested = str(sp.season);
  const entrySeason: SeasonRef = requested === "all" ? null : requested && /^[0-9a-f-]{36}$/i.test(requested) ? requested : "current";
  const q = str(sp.q);
  const page = Number(str(sp.page) ?? 1) || 1;

  const [members, domains, seasons, entries] = await Promise.all([
    listMembersWithMarks(clubId, "current"),
    listDomains(clubId),
    listSeasons(clubId),
    listEntries(clubId, { season: entrySeason, q, page }),
  ]);
  const current = seasons.find((s) => s.isCurrent) ?? null;
  const seasonFilter = entrySeason === "current" ? (current?.id ?? "all") : (entrySeason ?? "all");

  const href = (p: number) => {
    const u = new URLSearchParams();
    if (seasonFilter) u.set("season", seasonFilter);
    if (q) u.set("q", q);
    u.set("page", String(p));
    return `?${u}`;
  };

  return (
    <>
      <PageHeader title="Marks" description="Award marks to one or many members at once. Every award is visible on the public board instantly." />

      <AwardForm
        clubId={clubId}
        season={current ? { id: current.id, name: current.name } : null}
        domains={domains.map((d) => ({ id: d.id, name: d.name }))}
        members={members.filter((m) => m.active).map((m) => ({ id: m.id, name: m.name, photoUrl: m.photoUrl, domainId: m.domainId, marks: m.marks }))}
      />

      <section className="card mt-8 overflow-hidden">
        <form className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center" action="">
          <h2 className="px-1 text-sm font-semibold sm:mr-auto">Activity log</h2>
          <select name="season" defaultValue={seasonFilter ?? "all"} className="input h-9 sm:w-48">
            <option value="all">All seasons</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isCurrent ? " (current)" : ""}
              </option>
            ))}
          </select>
          <div className="relative sm:w-64">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={q ?? ""} className="input h-9 pl-9" placeholder="Member, reason or admin…" />
          </div>
          <button className="btn btn-secondary h-9">Filter</button>
        </form>
        <EntryList clubId={clubId} entries={entries.rows.map((e) => ({ ...e, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt?.toISOString() ?? null }))} total={entries.total} />
        <Pagination page={entries.page} pageCount={entries.pageCount} href={href} />
      </section>
    </>
  );
}
