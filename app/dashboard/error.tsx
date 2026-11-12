"use client";

import { ErrorPanel } from "@/components/ErrorPanel";

export default function DashboardError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel {...props} home="/dashboard" />;
}
