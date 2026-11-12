import { cn, hueFor, initials } from "@/lib/utils";

const sizes = { xs: "size-6 text-[9px]", sm: "size-8 text-[11px]", md: "size-10 text-xs", lg: "size-14 text-base", xl: "size-20 text-xl" };

export function Avatar({ name, src, size = "sm", className }: { name: string; src?: string | null; size?: keyof typeof sizes; className?: string }) {
  if (src) {
    return (
      // Member photos are arbitrary external URLs, so next/image's allow-list doesn't fit here.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" className={cn("shrink-0 rounded-full object-cover ring-1 ring-line", sizes[size], className)} />
    );
  }
  const hue = hueFor(name);
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold", sizes[size], className)}
      style={{ background: `color-mix(in oklab, oklch(0.7 0.13 ${hue}) 22%, var(--surface))`, color: `color-mix(in oklab, oklch(0.55 0.14 ${hue}) 85%, var(--ink))` }}
    >
      {initials(name)}
    </span>
  );
}
