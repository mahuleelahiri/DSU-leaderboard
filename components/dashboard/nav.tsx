"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Award,
  Building2,
  CalendarRange,
  Inbox,
  LayoutDashboard,
  Layers,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/buttons";

/** Icons are resolved client-side so server components can pass plain strings. */
const icons = {
  overview: LayoutDashboard,
  marks: Award,
  members: Users,
  domains: Layers,
  seasons: CalendarRange,
  requests: Inbox,
  team: UsersRound,
  settings: Settings,
  clubs: Building2,
  admins: ShieldCheck,
  audit: ScrollText,
} satisfies Record<string, LucideIcon>;

export type NavItem = { href: string; label: string; icon: keyof typeof icons; badge?: number; exact?: boolean };

export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Section" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex w-max gap-1 lg:w-auto lg:flex-col">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = icons[item.icon];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:bg-surface-2 hover:text-ink",
                  active && "bg-surface text-ink shadow-sm ring-1 ring-line",
                )}
              >
                <Icon size={16} className={active ? "text-brand" : ""} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? <span className="badge badge-brand tabular h-5 min-w-5 justify-center px-1.5">{item.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function UserMenu({ name, email, isSuperAdmin }: { name: string; email: string; isSuperAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <div className="relative">
      <button className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-surface-2" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <Avatar name={name} size="sm" />
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{name}</span>
      </button>
      {open && (
        <>
          <button aria-hidden tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="card absolute right-0 z-50 mt-2 w-64 animate-rise p-1.5 shadow-pop">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-muted">{email}</p>
              {isSuperAdmin && <span className="badge badge-brand mt-2">Platform admin</span>}
            </div>
            <div className="my-1 h-px bg-line" />
            <Link role="menuitem" href="/dashboard" onClick={() => setOpen(false)} className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm hover:bg-surface-2">
              <LayoutDashboard size={15} className="text-muted" /> My clubs
            </Link>
            <Link role="menuitem" href="/dashboard/account" onClick={() => setOpen(false)} className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm hover:bg-surface-2">
              <UserCog size={15} className="text-muted" /> Account & email
            </Link>
            {isSuperAdmin && (
              <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm hover:bg-surface-2">
                <ShieldCheck size={15} className="text-muted" /> Platform admin
              </Link>
            )}
            <button role="menuitem" onClick={signOut} disabled={signingOut} className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-sm text-danger hover:bg-danger-soft">
              {signingOut ? <Spinner size={15} /> : <LogOut size={15} />} Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
