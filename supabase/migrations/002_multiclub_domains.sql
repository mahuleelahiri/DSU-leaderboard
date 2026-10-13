begin;

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  access_code text not null unique check (access_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

create or replace function public.generate_access_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  char_index integer;
begin
  loop
    candidate := '';
    for char_index in 1..6 loop
      candidate := candidate || pg_catalog.substr(alphabet, (pg_catalog.floor(pg_catalog.random() * pg_catalog.length(alphabet)) + 1)::integer, 1);
    end loop;
    if not exists (select 1 from public.clubs where access_code = candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;
revoke all on function public.generate_access_code() from public;

create table public.super_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.domains (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (id, club_id)
);
create unique index domains_name_per_club_idx on public.domains (club_id, lower(trim(name)));

do $$
declare
  legacy_club uuid;
begin
  insert into public.clubs (name, access_code)
  values ('Existing Club', public.generate_access_code())
  returning id into legacy_club;

  insert into public.domains (club_id, name) values
    (legacy_club, 'Photography'),
    (legacy_club, 'Videography'),
    (legacy_club, 'Graphic Design'),
    (legacy_club, 'UI/UX'),
    (legacy_club, 'Illustration & Animation'),
    (legacy_club, 'Needs domain assignment');
end;
$$;

alter table public.admins add column club_id uuid references public.clubs (id);
alter table public.members add column club_id uuid references public.clubs (id);
alter table public.members add column domain_id uuid;
alter table public.seasons add column club_id uuid references public.clubs (id);
alter table public.mark_entries add column club_id uuid references public.clubs (id);
alter table public.mark_entries add column legacy_category_name text;

create table public.legacy_categories_archive (
  id uuid primary key,
  club_id uuid not null references public.clubs (id),
  name text not null,
  default_marks integer,
  created_at timestamptz not null
);

do $$
declare
  legacy_club uuid;
  unassigned_domain uuid;
begin
  select id into strict legacy_club from public.clubs where name = 'Existing Club';
  select id into strict unassigned_domain from public.domains where club_id = legacy_club and name = 'Needs domain assignment';

  update public.admins set club_id = legacy_club where club_id is null;
  update public.members set club_id = legacy_club, domain_id = unassigned_domain where club_id is null;
  update public.seasons set club_id = legacy_club where club_id is null;
  update public.mark_entries set club_id = legacy_club where club_id is null;

  insert into public.legacy_categories_archive (id, club_id, name, default_marks, created_at)
  select id, legacy_club, name, default_marks, created_at from public.categories;

  update public.mark_entries entries
  set legacy_category_name = categories.name
  from public.categories categories
  where entries.category_id = categories.id;
end;
$$;

alter table public.admins alter column club_id set not null;
alter table public.members alter column club_id set not null;
alter table public.members alter column domain_id set not null;
alter table public.seasons alter column club_id set not null;
alter table public.mark_entries alter column club_id set not null;

alter table public.mark_entries drop constraint mark_entries_member_id_fkey;
alter table public.mark_entries drop constraint mark_entries_category_id_fkey;
alter table public.mark_entries drop constraint mark_entries_given_by_fkey;
alter table public.mark_entries drop constraint mark_entries_season_id_fkey;

alter table public.admins drop constraint admins_pkey;
alter table public.admins drop constraint admins_email_key;
alter table public.admins add constraint admins_pkey primary key (user_id, club_id);

alter table public.members add constraint members_id_club_unique unique (id, club_id);
alter table public.members add constraint members_domain_same_club_fk foreign key (domain_id, club_id) references public.domains (id, club_id) on delete restrict;
alter table public.seasons add constraint seasons_id_club_unique unique (id, club_id);

alter table public.mark_entries drop column category_id;
alter table public.mark_entries add constraint entries_member_same_club_fk foreign key (member_id, club_id) references public.members (id, club_id) on delete restrict;
alter table public.mark_entries add constraint entries_admin_same_club_fk foreign key (given_by, club_id) references public.admins (user_id, club_id) on delete restrict;
alter table public.mark_entries add constraint entries_season_same_club_fk foreign key (season_id, club_id) references public.seasons (id, club_id) on delete restrict;

drop index if exists public.seasons_one_current_idx;
create unique index seasons_one_current_per_club_idx on public.seasons (club_id) where is_current;
create index members_club_domain_idx on public.members (club_id, domain_id, active);
create index members_club_name_idx on public.members (club_id, lower(trim(name)));
create index entries_club_season_idx on public.mark_entries (club_id, season_id, member_id);
create index mark_entries_club_created_idx on public.mark_entries (club_id, created_at desc);

drop policy if exists "Public can read members" on public.members;
drop policy if exists "Admins can manage members" on public.members;
drop policy if exists "Public can read categories" on public.categories;
drop policy if exists "Admins can manage categories" on public.categories;
drop policy if exists "Public can read seasons" on public.seasons;
drop policy if exists "Admins can manage seasons" on public.seasons;
drop policy if exists "Public can read mark entries" on public.mark_entries;
drop policy if exists "Admins can add marks as themselves" on public.mark_entries;
drop policy if exists "Admins can edit mark entries" on public.mark_entries;
drop policy if exists "Admins can delete mark entries" on public.mark_entries;
drop policy if exists "Users can read their own admin record" on public.admins;
drop policy if exists "Admins can add admins" on public.admins;
drop policy if exists "Admins can edit admins" on public.admins;
drop policy if exists "Admins can remove admins" on public.admins;

drop table public.categories;
drop function if exists public.is_admin();

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  domain_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  foreign key (domain_id, club_id) references public.domains (id, club_id) on delete restrict
);
create index join_requests_club_status_idx on public.join_requests (club_id, status, created_at desc);

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.super_admins where user_id = (select auth.uid()));
$$;

create or replace function public.is_club_admin(target_club uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins
    where user_id = (select auth.uid()) and club_id = target_club
  );
$$;

revoke all on function public.is_super_admin() from public;
revoke all on function public.is_club_admin(uuid) from public;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_club_admin(uuid) to authenticated;

alter table public.clubs enable row level security;
alter table public.super_admins enable row level security;
alter table public.domains enable row level security;
alter table public.admins enable row level security;
alter table public.members enable row level security;
alter table public.seasons enable row level security;
alter table public.mark_entries enable row level security;
alter table public.join_requests enable row level security;
alter table public.legacy_categories_archive enable row level security;

create policy "Club admins and super admins can view clubs" on public.clubs for select to authenticated using (
  (select public.is_super_admin()) or (select public.is_club_admin(id))
);
create policy "Only super admins can edit clubs" on public.clubs for update to authenticated using ((select public.is_super_admin())) with check ((select public.is_super_admin()));
create policy "Users can read their own super admin record" on public.super_admins for select to authenticated using (user_id = (select auth.uid()));

create policy "Club admins can view club domains" on public.domains for select to authenticated using (
  (select public.is_super_admin()) or (select public.is_club_admin(club_id))
);
create policy "Club admins can manage club domains" on public.domains for all to authenticated using (
  (select public.is_super_admin()) or (select public.is_club_admin(club_id))
) with check ((select public.is_super_admin()) or (select public.is_club_admin(club_id)));

create policy "Club admins can view club members" on public.members for select to authenticated using (
  (select public.is_super_admin()) or (select public.is_club_admin(club_id))
);
create policy "Club admins can manage club members" on public.members for all to authenticated using (
  (select public.is_super_admin()) or (select public.is_club_admin(club_id))
) with check ((select public.is_super_admin()) or (select public.is_club_admin(club_id)));

create policy "Club admins can view club seasons" on public.seasons for select to authenticated using (
  (select public.is_super_admin()) or (select public.is_club_admin(club_id))
);
create policy "Club admins can manage club seasons" on public.seasons for all to authenticated using (
  (select public.is_super_admin()) or (select public.is_club_admin(club_id))
) with check ((select public.is_super_admin()) or (select public.is_club_admin(club_id)));

create policy "Club admins can view club marks" on public.mark_entries for select to authenticated using (
  (select public.is_super_admin()) or (select public.is_club_admin(club_id))
);
create policy "Club admins can add club marks as themselves" on public.mark_entries for insert to authenticated with check (
  ((select public.is_super_admin()) or (select public.is_club_admin(club_id))) and given_by = (select auth.uid())
);
create policy "Club admins can edit club marks" on public.mark_entries for update to authenticated using (
  (select public.is_super_admin()) or (select public.is_club_admin(club_id))
) with check ((select public.is_super_admin()) or (select public.is_club_admin(club_id)));
create policy "Club admins can delete club marks" on public.mark_entries for delete to authenticated using (
  (select public.is_super_admin()) or (select public.is_club_admin(club_id))
);

create policy "Admins can view admins in their clubs" on public.admins for select to authenticated using (
  user_id = (select auth.uid()) or (select public.is_super_admin()) or (select public.is_club_admin(club_id))
);
create policy "Club admins can review join requests" on public.join_requests for select to authenticated using (
  (select public.is_super_admin()) or (select public.is_club_admin(club_id))
);

revoke all on public.clubs, public.super_admins, public.domains, public.admins,
  public.members, public.seasons, public.mark_entries, public.join_requests,
  public.legacy_categories_archive from anon, authenticated;
grant select, update on public.clubs to authenticated;
grant select on public.super_admins, public.admins to authenticated;
grant select, insert, update, delete on public.domains, public.members, public.seasons, public.mark_entries to authenticated;
grant select on public.join_requests to authenticated;

create or replace function public.enforce_unique_member_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.clubs where id = new.club_id for update;
  if exists (
    select 1 from public.members existing
    where existing.club_id = new.club_id
      and pg_catalog.lower(pg_catalog.btrim(existing.name)) = pg_catalog.lower(pg_catalog.btrim(new.name))
      and existing.id is distinct from new.id
  ) then
    raise exception 'A member with this name already exists in this club.' using errcode = '23505';
  end if;
  return new;
end;
$$;
create trigger members_unique_name_per_club
before insert or update of name, club_id on public.members
for each row execute function public.enforce_unique_member_name();

create or replace function public.get_public_club(code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'season_name', current_season.name,
    'domains', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('id', domain_data.id, 'name', domain_data.name, 'member_count', domain_data.member_count, 'members', domain_data.members)
        order by domain_data.member_count desc, domain_data.name
      )
      from (
        select d.id, d.name, pg_catalog.count(board.id)::integer as member_count,
          coalesce(pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object('id', board.id, 'name', board.name, 'photo_url', board.photo_url, 'marks', board.marks, 'rank', board.rank)
            order by board.rank, board.name
          ) filter (where board.id is not null), '[]'::jsonb) as members
        from public.domains d
        left join lateral (
          select totals.id, totals.name, totals.photo_url, totals.marks,
            pg_catalog.rank() over (order by totals.marks desc)::integer as rank
          from (
            select m.id, m.name, m.photo_url, coalesce(pg_catalog.sum(e.marks), 0)::integer as marks
            from public.members m
            left join public.mark_entries e on e.member_id = m.id and e.club_id = m.club_id and e.season_id = current_season.id
            where m.club_id = c.id and m.domain_id = d.id and m.active
            group by m.id
          ) totals
        ) board on true
        where d.club_id = c.id
        group by d.id, d.name
      ) domain_data
    ), '[]'::jsonb)
  )
  from public.clubs c
  left join public.seasons current_season on current_season.club_id = c.id and current_season.is_current
  where c.access_code = pg_catalog.upper(pg_catalog.btrim(code));
$$;

create or replace function public.get_public_member_history(code text, target_member uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'member', pg_catalog.jsonb_build_object('id', m.id, 'name', m.name, 'photo_url', m.photo_url, 'domain', d.name),
    'entries', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', e.id, 'marks', e.marks, 'reason', e.reason, 'created_at', e.created_at,
        'season_name', s.name, 'given_by', a.name
      ) order by e.created_at desc)
      from public.mark_entries e
      join public.seasons s on s.id = e.season_id and s.club_id = e.club_id
      left join public.admins a on a.user_id = e.given_by and a.club_id = e.club_id
      where e.club_id = c.id and e.member_id = m.id
    ), '[]'::jsonb)
  )
  from public.clubs c
  join public.members m on m.club_id = c.id and m.id = target_member and m.active
  join public.domains d on d.id = m.domain_id and d.club_id = m.club_id
  where c.access_code = pg_catalog.upper(pg_catalog.btrim(code));
$$;

create or replace function public.submit_join_request(code text, requested_name text, requested_domain uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_club uuid;
  request_id uuid;
begin
  select id into target_club from public.clubs
  where access_code = pg_catalog.upper(pg_catalog.btrim(code)) for update;
  if target_club is null then raise exception 'Club code not found.' using errcode = '22023'; end if;
  if pg_catalog.length(pg_catalog.btrim(requested_name)) not between 1 and 80 then
    raise exception 'Enter a name between 1 and 80 characters.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.domains where id = requested_domain and club_id = target_club) then
    raise exception 'Choose a domain in this club.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.members where club_id = target_club
      and pg_catalog.lower(pg_catalog.btrim(name)) = pg_catalog.lower(pg_catalog.btrim(requested_name))
  ) or exists (
    select 1 from public.join_requests where club_id = target_club and status = 'pending'
      and pg_catalog.lower(pg_catalog.btrim(name)) = pg_catalog.lower(pg_catalog.btrim(requested_name))
  ) then
    raise exception 'A member or pending request already uses this name.' using errcode = '23505';
  end if;
  insert into public.join_requests (club_id, domain_id, name)
  values (target_club, requested_domain, pg_catalog.btrim(requested_name))
  returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.review_join_request(request_id uuid, approve boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.join_requests%rowtype;
begin
  select * into request_row from public.join_requests where id = request_id for update;
  if request_row.id is null then raise exception 'Join request not found.'; end if;
  if not (public.is_super_admin() or public.is_club_admin(request_row.club_id)) then
    raise exception 'You cannot review requests for this club.' using errcode = '42501';
  end if;
  if request_row.status <> 'pending' then raise exception 'This request has already been reviewed.'; end if;
  if approve then
    insert into public.members (club_id, domain_id, name)
    values (request_row.club_id, request_row.domain_id, request_row.name);
    update public.join_requests set status = 'approved' where id = request_row.id;
    return 'approved';
  end if;
  update public.join_requests set status = 'rejected' where id = request_row.id;
  return 'rejected';
end;
$$;

create or replace function public.create_club(club_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_club uuid;
  new_code text;
begin
  if not public.is_super_admin() then raise exception 'Super-admin access required.' using errcode = '42501'; end if;
  if pg_catalog.length(pg_catalog.btrim(club_name)) not between 1 and 100 then raise exception 'Enter a club name.'; end if;
  new_code := public.generate_access_code();
  insert into public.clubs (name, access_code) values (pg_catalog.btrim(club_name), new_code) returning id into new_club;
  insert into public.domains (club_id, name) values
    (new_club, 'Photography'), (new_club, 'Videography'), (new_club, 'Graphic Design'),
    (new_club, 'UI/UX'), (new_club, 'Illustration & Animation');
  return pg_catalog.jsonb_build_object('id', new_club, 'name', pg_catalog.btrim(club_name), 'access_code', new_code);
end;
$$;

create or replace function public.assign_club_admin(target_club uuid, target_user uuid, admin_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_email text;
begin
  if not public.is_super_admin() then raise exception 'Super-admin access required.' using errcode = '42501'; end if;
  select email into account_email from auth.users where id = target_user;
  if account_email is null then raise exception 'The user must sign in before being assigned.'; end if;
  insert into public.admins (user_id, club_id, email, name)
  values (target_user, target_club, account_email, pg_catalog.btrim(admin_name))
  on conflict (user_id, club_id) do update set email = excluded.email, name = excluded.name;
end;
$$;

create or replace function public.regenerate_club_access_code(target_club uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_code text;
begin
  if not (public.is_super_admin() or public.is_club_admin(target_club)) then
    raise exception 'Club-admin access required.' using errcode = '42501';
  end if;
  new_code := public.generate_access_code();
  update public.clubs set access_code = new_code where id = target_club;
  if not found then raise exception 'Club not found.'; end if;
  return new_code;
end;
$$;

revoke all on function public.get_public_club(text) from public;
revoke all on function public.get_public_member_history(text, uuid) from public;
revoke all on function public.submit_join_request(text, text, uuid) from public;
revoke all on function public.review_join_request(uuid, boolean) from public;
revoke all on function public.create_club(text) from public;
revoke all on function public.assign_club_admin(uuid, uuid, text) from public;
revoke all on function public.regenerate_club_access_code(uuid) from public;
grant execute on function public.get_public_club(text) to anon, authenticated;
grant execute on function public.get_public_member_history(text, uuid) to anon, authenticated;
grant execute on function public.submit_join_request(text, text, uuid) to anon, authenticated;
grant execute on function public.review_join_request(uuid, boolean) to authenticated;
grant execute on function public.create_club(text) to authenticated;
grant execute on function public.assign_club_admin(uuid, uuid, text) to authenticated;
grant execute on function public.regenerate_club_access_code(uuid) to authenticated;

commit;