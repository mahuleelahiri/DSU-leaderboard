"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toaster";

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <LoaderCircle size={size} className={cn("animate-spin", className)} aria-hidden />;
}

export function CopyButton({ value, label = "Copy", className, children }: { value: string; label?: string; className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      className={cn("btn btn-secondary btn-sm", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          toast.error("Couldn't access the clipboard.");
        }
      }}
    >
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
      {children ?? (copied ? "Copied" : label)}
    </button>
  );
}

/**
 * Two-step destructive button: the first click arms it, the second confirms.
 * Disarms automatically after a few seconds.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Click again to confirm",
  className,
  pending,
  disabled,
  title,
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  className?: string;
  pending?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 3500);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return (
    <button
      type="button"
      title={title}
      disabled={pending || disabled}
      className={cn(className, armed && "!bg-danger !text-white")}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {pending ? <Spinner size={14} /> : armed ? confirmLabel : children}
    </button>
  );
}
