"use client";

import { useCallback, useTransition } from "react";
import { useToast } from "@/components/ui/Toaster";

type Result<T> = { ok: true; data: T; message?: string } | { ok: false; error: string };

/**
 * Runs a server action inside a transition and reports the outcome as a toast.
 * Returns the data on success, or null on failure.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const run = useCallback(
    <T,>(action: () => Promise<Result<T>>, options: { silent?: boolean; onSuccess?: (data: T) => void } = {}) =>
      new Promise<T | null>((resolve) => {
        startTransition(async () => {
          try {
            const result = await action();
            if (result.ok) {
              if (!options.silent && result.message) toast.success(result.message);
              options.onSuccess?.(result.data);
              resolve(result.data);
            } else {
              toast.error(result.error);
              resolve(null);
            }
          } catch {
            toast.error("Network error. Check your connection and try again.");
            resolve(null);
          }
        });
      }),
    [toast],
  );

  return [pending, run] as const;
}
