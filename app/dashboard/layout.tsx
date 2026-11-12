import type { Metadata } from "next";
import { TopBar } from "@/components/dashboard/TopBar";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Clubhouse" }, robots: { index: false } };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar section="Dashboard" />
      {children}
    </div>
  );
}
