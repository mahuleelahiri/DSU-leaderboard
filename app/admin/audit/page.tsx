import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { listAuditLogs } from "@/lib/admin-data";
import { requireSuperAdminPage } from "@/lib/dal";
import { formatDateTime } from "@/lib/utils";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireSuperAdminPage();
  const sp = await searchParams;
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;
  const audit = await listAuditLogs(null, page);

  return (
    <>
      <PageHeader title="Audit log" description={`${audit.total} privileged actions recorded across the platform.`} />
      <section className="card overflow-hidden">
        {audit.rows.length === 0 ? (
          <EmptyState icon={ScrollText} title="Nothing logged yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Club</th>
                  <th>Action</th>
                  <th className="hidden md:table-cell">By</th>
                </tr>
              </thead>
              <tbody>
                {audit.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="tabular text-xs whitespace-nowrap text-muted">{formatDateTime(row.createdAt)}</td>
                    <td className="text-sm whitespace-nowrap">
                      {row.clubId && row.clubName ? (
                        <Link href={`/dashboard/${row.clubId}`} className="hover:text-brand">
                          {row.clubName}
                        </Link>
                      ) : (
                        <span className="text-muted">Platform</span>
                      )}
                    </td>
                    <td>
                      <p className="text-sm">{row.summary}</p>
                      <p className="font-mono text-[11px] text-muted">{row.action}</p>
                    </td>
                    <td className="hidden text-xs text-muted md:table-cell">{row.actorEmail ?? "system"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={audit.page} pageCount={audit.pageCount} href={(p) => `?page=${p}`} />
      </section>
    </>
  );
}
