import { ArrowUp, CalendarRange, Crown, History, Inbox, Layers, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { CodeEntry } from "@/components/board/CodeEntry";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { Avatar } from "@/components/ui/Avatar";

const features = [
  { icon: Zap, title: "Live leaderboards", body: "Boards update the moment an admin awards marks, with rank movement for the week." },
  { icon: Layers, title: "Domains & teams", body: "Split members into domains like Design or Web Dev, each with its own ranking." },
  { icon: CalendarRange, title: "Seasons", body: "Start fresh each semester and keep every past season browsable forever." },
  { icon: Inbox, title: "Join requests", body: "Visitors can ask to join; admins approve them into the right domain in one click." },
  { icon: ShieldCheck, title: "Roles & audit trail", body: "Owners and editors per club, platform admins above them, and every change logged." },
  { icon: History, title: "Transparent history", body: "Tap anyone on the board to see exactly how they earned every mark." },
];

const preview = [
  { name: "Aarav Sharma", marks: 342, move: 2 },
  { name: "Meera Iyer", marks: 318, move: 0 },
  { name: "Kabir Das", marks: 297, move: 1 },
  { name: "Riya Kapoor", marks: 251, move: -1 },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="relative flex-1 overflow-hidden">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[640px]" />
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />

        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 md:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="animate-rise">
            <span className="badge badge-brand mb-5">
              <Sparkles size={12} /> Built for student clubs
            </span>
            <h1 className="text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-6xl">
              Every contribution, <span className="bg-gradient-to-r from-brand to-[oklch(0.65_0.2_330)] bg-clip-text text-transparent">counted.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted text-pretty">
              Clubhouse turns participation into a friendly, transparent leaderboard. Award marks, run seasons, and let members see exactly where they stand.
            </p>
            <div className="mt-8 max-w-md">
              <CodeEntry />
            </div>
          </div>

          <div aria-hidden className="relative hidden animate-rise [animation-delay:120ms] lg:block">
            <div className="card rotate-[1.5deg] p-5 shadow-pop">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="eyebrow">Design Society · Season 2026</p>
                  <p className="mt-1 font-semibold">Overall standings</p>
                </div>
                <span className="badge badge-success">
                  <span className="size-1.5 animate-pulse rounded-full bg-success" /> Live
                </span>
              </div>
              <ol className="space-y-1.5">
                {preview.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3 rounded-xl px-2.5 py-2 odd:bg-surface-2">
                    <span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-gold-soft text-gold" : i === 1 ? "bg-silver-soft text-silver" : i === 2 ? "bg-bronze-soft text-bronze" : "text-muted"}`}>
                      {i === 0 ? <Crown size={13} /> : i + 1}
                    </span>
                    <Avatar name={p.name} size="sm" />
                    <span className="flex-1 text-sm font-medium">{p.name}</span>
                    {p.move !== 0 && (
                      <span className={`flex items-center text-xs font-semibold ${p.move > 0 ? "text-success" : "text-danger"}`}>
                        <ArrowUp size={12} className={p.move < 0 ? "rotate-180" : ""} />
                        {Math.abs(p.move)}
                      </span>
                    )}
                    <span className="tabular w-12 text-right font-semibold">{p.marks}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="card absolute -bottom-8 -left-10 w-56 -rotate-3 p-4 shadow-pop">
              <p className="eyebrow">Just now</p>
              <p className="mt-1.5 text-sm">
                <strong>+25</strong> to Aarav for leading the poster workshop 🎨
              </p>
            </div>
          </div>
        </section>

        <section className="relative border-t border-line bg-surface/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <p className="eyebrow">Everything a club needs</p>
            <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-balance">From the first meetup to the end-of-year awards.</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, body }) => (
                <div key={title} className="card p-5 transition-shadow hover:shadow-card">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand-soft-ink">
                    <Icon size={17} />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              ["01", "Platform admin creates a club", "Pick a domain template and assign an owner by email. A unique access code is generated."],
              ["02", "Owners build the roster", "Add members one by one, bulk-import from a spreadsheet, or approve join requests."],
              ["03", "Award marks, share the code", "Every award shows up on the public board instantly. Members tap their name to see why."],
            ].map(([step, title, body]) => (
              <div key={step}>
                <span className="font-mono text-sm text-brand">{step}</span>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
