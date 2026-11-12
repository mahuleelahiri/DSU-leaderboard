import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Trophy, type LucideIcon } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5 font-semibold tracking-tight text-ink">
      <span className="grid size-8 place-items-center rounded-[10px] bg-brand text-brand-ink shadow-sm transition-transform group-hover:-rotate-6">
        <Trophy size={16} strokeWidth={2.4} />
      </span>
      {!compact && <span className="text-[15px]">Clubhouse</span>}
    </Link>
  );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
        <Icon size={22} />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "brand" }: { label: string; value: number | string; hint?: ReactNode; icon: LucideIcon; tone?: "brand" | "success" | "warn" | "gold" }) {
  const tones = { brand: "bg-brand-soft text-brand-soft-ink", success: "bg-success-soft text-success", warn: "bg-warn-soft text-warn", gold: "bg-gold-soft text-gold" };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <span className={cn("grid size-7 place-items-center rounded-lg", tones[tone])}>
          <Icon size={14} />
        </span>
      </div>
      <p className="tabular mt-2 text-2xl font-semibold tracking-tight">{typeof value === "number" ? formatNumber(value) : value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Link-based pagination that preserves the other query params. */
export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
      <span className="text-muted">
        Page <span className="tabular font-medium text-ink">{page}</span> of <span className="tabular">{pageCount}</span>
      </span>
      <div className="flex gap-1.5">
        <Link aria-disabled={page <= 1} className={cn("btn btn-secondary btn-sm", page <= 1 && "pointer-events-none opacity-50")} href={href(page - 1)}>
          <ChevronLeft size={14} /> Prev
        </Link>
        <Link aria-disabled={page >= pageCount} className={cn("btn btn-secondary btn-sm", page >= pageCount && "pointer-events-none opacity-50")} href={href(page + 1)}>
          Next <ChevronRight size={14} />
        </Link>
      </div>
    </nav>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function MarksDelta({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("tabular font-semibold", value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-muted", className)}>
      {value > 0 ? "+" : value < 0 ? "−" : ""}
      {formatNumber(Math.abs(value))}
    </span>
  );
}
