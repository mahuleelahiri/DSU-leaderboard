# Clubhouse

Clubhouse is a multi-club leaderboard that supports public read-only boards, club-scoped admin tools, and club code access. This project is being migrated from Supabase to Neon Postgres + Better Auth + Resend.

## Neon migration setup

### 1. Create a Neon project

1. Sign in to [Neon](https://neon.tech/).
2. Create a new project and database.
3. Copy the pooled database connection string.
4. In `.env.local`, add:

   ```env
   DATABASE_URL=postgresql://username:password@ep-example.neon.tech/neondb?sslmode=require
   BETTER_AUTH_SECRET=replace-with-a-long-random-secret
   BETTER_AUTH_URL=http://localhost:3000
   RESEND_API_KEY=re_1234567890
   RESEND_FROM_EMAIL=Clubhouse <no-reply@yourdomain.com>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEON_OBJECT_STORAGE_BUCKET=clubhouse-assets
   ```

### 2. Install dependencies

```bash
npm install
```

### 3. Generate and run Drizzle migrations

```bash
npm run db:generate
npm run db:migrate
```

The schema lives in [lib/db/schema.ts](lib/db/schema.ts). It includes the Better Auth tables plus the app tables for clubs, admins, members, domains, seasons, join requests, and leaderboard data.

### 4. Set up Resend

1. Create a free account at [resend.com](https://resend.com/).
2. Verify your domain or use a test domain.
3. Create an API key.
4. Add the key to `RESEND_API_KEY`.
5. Set `RESEND_FROM_EMAIL` to a verified sender such as `Clubhouse <no-reply@yourdomain.com>`.

This app uses Better Auth email OTP, so Resend sends the 6-digit admin sign-in code.

### 5. Better Auth email OTP

The auth setup is configured in [lib/auth.ts](lib/auth.ts) and uses the Better Auth email OTP plugin with a 6-digit code. The route for auth handling is in [app/api/auth/[...all]/route.ts](app/api/auth/[...all]/route.ts).

### 6. Make yourself the super admin

After a user signs in with the admin email, insert that user into the app’s super admin table in Neon:

```sql
insert into public.super_admins (user_id)
select id
from "user"
where lower(email) = lower('you@example.com')
on conflict (user_id) do nothing;
```

Then sign in again at `/super-admin` and create clubs, assign admins, and manage the platform.

## Local development

```bash
npm run dev
```

Open http://localhost:3000 and continue with the normal club code flow.

## Production deployment

1. Set the same variables in your deployment environment.
2. Set `BETTER_AUTH_URL` to the public production URL.
3. Add the production URL to your auth trust/origin list if required by your deployment platform.
4. Run:

   ```bash
   npm run lint
   npm run build
   ```

## Notes on the migration

- The application is being migrated off Supabase and onto Neon Postgres, Better Auth, and server-side permission checks.
- The app must eventually move all permission checks to server-side route handlers and server actions, rather than trusting client-side state.
- Club lookup remains code-scoped and server-side to prevent broad list access.
- Neon Object Storage is the target for club logos and wallpapers once the file upload layer is moved off Supabase Storage.

