create extension if not exists pgcrypto;

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  photo_url text,
  active boolean not null default true,
  joined_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  default_marks integer,
  created_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  constraint seasons_date_order check (start_date <= end_date)
);

create unique index seasons_one_current_idx on public.seasons (is_current) where is_current;

create table public.mark_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  marks integer not null,
  reason text,
  given_by uuid not null references public.admins (user_id) on delete restrict,
  season_id uuid not null references public.seasons (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index mark_entries_season_member_idx on public.mark_entries (season_id, member_id);
create index mark_entries_category_idx on public.mark_entries (category_id);
create index mark_entries_created_at_idx on public.mark_entries (created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admins enable row level security;
alter table public.members enable row level security;
alter table public.categories enable row level security;
alter table public.seasons enable row level security;
alter table public.mark_entries enable row level security;

create policy "Public can read members" on public.members for select to anon, authenticated using (true);
create policy "Admins can manage members" on public.members for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Public can read categories" on public.categories for select to anon, authenticated using (true);
create policy "Admins can manage categories" on public.categories for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Public can read seasons" on public.seasons for select to anon, authenticated using (true);
create policy "Admins can manage seasons" on public.seasons for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Public can read mark entries" on public.mark_entries for select to anon, authenticated using (true);
create policy "Admins can add marks as themselves" on public.mark_entries for insert to authenticated with check (
  (select public.is_admin()) and given_by = (select auth.uid())
);
create policy "Admins can edit mark entries" on public.mark_entries for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete mark entries" on public.mark_entries for delete to authenticated using ((select public.is_admin()));

create policy "Users can read their own admin record" on public.admins for select to authenticated using (
  user_id = (select auth.uid()) or (select public.is_admin())
);
create policy "Admins can add admins" on public.admins for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can edit admins" on public.admins for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can remove admins" on public.admins for delete to authenticated using ((select public.is_admin()));

grant select on public.members, public.categories, public.seasons, public.mark_entries to anon, authenticated;
grant insert, update, delete on public.members, public.categories, public.seasons, public.mark_entries to authenticated;
grant select, insert, update, delete on public.admins to authenticated;

insert into public.categories (name, default_marks) values
  ('Attendance', 1),
  ('Performance', 3),
  ('Discipline', -1)
on conflict (name) do nothing;