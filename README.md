# Clubhouse

**Live, shareable leaderboards for student clubs.** Admins award marks for participation, members see exactly where they stand, and every change is audited.

Built with Next.js 16 (App Router, Cache Components, Server Actions), React 19, Drizzle ORM on Postgres (Neon), Better Auth (passwordless email OTP), Resend and Tailwind CSS v4.

---

## Features

**Public board** (`/c/CODE`, no account needed)
- Podium for the top three, full ranking with tie-aware ranks (1, 1, 3…)
- Weekly **rank movement** arrows (▲2 / ▼1) and "+N this week"
- Per-domain rankings, member search, browsable past seasons
- Tap any member to see their full mark history with reasons
- "Join" requests with honeypot + per-IP rate limiting
- Auto-refreshes every minute while visible; light/dark/system theme

**Club dashboard** (`/dashboard/[clubId]`)
- Overview: KPIs, 30-day activity chart, domain totals, top members, recent activity
- Award marks to many members at once with presets and reason suggestions
- Searchable, paginated activity log with inline edit/delete
- Members: add, edit, deactivate, delete, **bulk import** from a pasted spreadsheet
- Domains, seasons (one current season enforced by the database), join-request review
- Team management with **owner / editor** roles and email invites (any address: college or personal)
- Account page: change display name or switch sign-in email with OTP verification
- Settings: club profile, access-code rotation, CSV exports, club activity log

**Platform admin** (`/admin`)
- Create clubs from domain templates with an owner invite; delete with typed confirmation
- Manage platform admins; platform-wide audit log

## Architecture

```
app/
  _actions/        Server Actions: club.ts, platform.ts, public.ts
  c/[code]/        Public leaderboard (cached, tag-invalidated)
  dashboard/       Club admin area (session-gated)
  admin/           Platform admin area
  api/             Auth, public JSON API, CSV export, health check
  sign-in/         Passwordless email-OTP flow
components/        UI primitives (ui/), board and dashboard components
lib/
  dal.ts           Data Access Layer: session + role checks (single source of truth)
  action.ts        Action wrapper: zod validation, friendly errors, no leaked internals
  club-data.ts     Public cached queries ('use cache' + cacheTag)
  admin-data.ts    Dashboard queries
  validation.ts    zod schemas shared by client and server
  db/schema.ts     Drizzle schema (constraints, indexes, enums)
  audit.ts         Append-only audit trail, written in the same transaction
  throttle.ts      Postgres-backed rate limiter (works across serverless instances)
proxy.ts           Optimistic auth redirect (Next 16 replacement for middleware)
drizzle/           SQL migrations
scripts/           Admin bootstrap and demo seed
tests/             Unit tests (vitest)
```

### Security model
- **Defense in depth:** `proxy.ts` redirects signed-out visitors, but every page *and* every Server Action re-checks the session and role through `lib/dal.ts`. A forged cookie that slips past the proxy is still rejected.
- **Roles:** platform admin → club owner → club editor. Owners manage settings, seasons, the team and destructive actions; editors handle day-to-day marks and members.
- **Invite-only auth:** unknown emails never receive a code (and get an identical response, so accounts can't be enumerated). OTPs expire in 5 minutes, allow 3 attempts and are rate-limited in Postgres.
- **Integrity in the database:** unique case-insensitive names per club, one current season per club (partial unique index), check constraints on codes, dates and marks, transactional multi-row writes with row locks for reviews.
- **Hardening:** strict security headers and CSP, open-redirect protection, CSV formula-injection escaping, no internal error messages sent to clients, access codes from a CSPRNG with an unambiguous alphabet.

### Caching
Public boards are cached with `'use cache'` and tagged per club. Every mutation calls `updateTag(board:<clubId>)`, so visitors see changes immediately (read-your-writes) without hitting the database on every view.

## Getting started

Requirements: Node 22.12+, a Postgres database (a free [Neon](https://neon.tech) project works).

```bash
npm install
cp .env.example .env.local      # then fill it in (see below)
npm run db:migrate              # apply migrations
npm run admin:create -- you@college.edu "Your Name"
npm run db:seed -- you@college.edu   # optional: demo club with realistic data
npm run dev
```

Open http://localhost:3000/sign-in. **Without `RESEND_API_KEY`, sign-in codes are printed in the terminal** running `npm run dev`, so you can work fully offline.

### Signing in with personal email addresses

Admins can use **any** address: college, Gmail, Outlook, iCloud and so on. Invite them with whichever address they prefer. An admin who was invited with a college address can switch to a personal one at **Account & email** (`/dashboard/account`):

- The confirmation code goes to the *new* address, so ownership is proven.
- All club roles move with the account.
- The old address gets a security notice, and the change is audited.
- An address that already belongs to another account is never sent a code.

> **Email delivery:** Resend's test mode only delivers to the email you signed up to Resend with. For codes to reach other people's personal inboxes, [verify a domain in Resend](https://resend.com/domains) and set `RESEND_FROM_EMAIL` to an address on it, e.g. `Clubhouse <no-reply@yourdomain.com>`. If this is misconfigured, the server log shows `email.send_failed` with a hint explaining the fix.

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon URLs use Neon's serverless driver; any other Postgres uses postgres.js |
| `BETTER_AUTH_SECRET` | yes | ≥ 32 chars in production: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | yes | Public URL of the deployment |
| `NEXT_PUBLIC_APP_URL` | recommended | Used for links in emails |
| `RESEND_API_KEY` | production | Optional locally |
| `RESEND_FROM_EMAIL` | production | A sender on a domain verified in Resend |
| `DATABASE_POOL_MAX` | no | Connections per instance (default 10) |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Develop, build, serve |
| `npm run check` | Lint + typecheck + unit tests |
| `npm test` | Unit tests (ranking, access codes, validation, redirects) |
| `npm run db:generate` | Create a migration after editing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Browse the database |
| `npm run admin:create -- <email> [name]` | Bootstrap a platform admin |
| `npm run db:seed -- [ownerEmail]` | Create a demo club |

## Deployment (Vercel + Neon)

1. Import the repo into Vercel and set the environment variables above, with `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` set to the production URL.
2. Run `npm run db:migrate` against the production database (locally with the production `DATABASE_URL`, or as a release step).
3. Run `npm run admin:create -- you@college.edu` once.
4. Point an uptime monitor at `/api/health` (returns 503 if the database is unreachable).

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and a production build on every push and pull request.

## Upgrading an existing database

Migration `0001_production_hardening` is additive: it adds roles, the audit log, rate-limit tables, indexes and constraints. Existing club admins become **owners** so nobody loses access, and historical entries get the awarding admin's name. The new unique indexes will fail to apply if a club already has two domains or two members whose names differ only by case or spacing, so check for those first.
