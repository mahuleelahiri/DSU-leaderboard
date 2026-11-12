"use client";

import { ErrorPanel } from "@/components/ErrorPanel";

export default function PlatformError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel {...props} home="/admin" />;
}
