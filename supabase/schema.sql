create extension if not exists "pgcrypto";

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  season text not null,
  accent text not null default '#f97316',
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  number text not null,
  image_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  match_date timestamptz not null,
  opponent_name text not null,
  location text not null,
  formation_key text not null,
  status text not null default 'draft' check (status in ('draft', 'ready')),
  created_at timestamptz not null default now()
);

create table if not exists public.match_lineup_slots (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  slot_key text not null,
  position_label text not null,
  x numeric(5,2) not null,
  y numeric(5,2) not null,
  manual_offset_x numeric(6,2) not null default 0,
  manual_offset_y numeric(6,2) not null default 0,
  player_id uuid references public.players (id) on delete set null,
  unique (match_id, slot_key)
);

create table if not exists public.match_bench_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

create table if not exists public.match_unavailable_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_lineup_slots enable row level security;
alter table public.match_bench_players enable row level security;
alter table public.match_unavailable_players enable row level security;

create policy "leaders manage own teams"
on public.teams
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "leaders manage own players"
on public.players
for all
using (
  exists (
    select 1
    from public.teams
    where teams.id = players.team_id
      and teams.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.teams
    where teams.id = players.team_id
      and teams.owner_user_id = auth.uid()
  )
);

create policy "leaders manage own matches"
on public.matches
for all
using (
  exists (
    select 1
    from public.teams
    where teams.id = matches.team_id
      and teams.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.teams
    where teams.id = matches.team_id
      and teams.owner_user_id = auth.uid()
  )
);

create policy "leaders manage own lineup slots"
on public.match_lineup_slots
for all
using (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = match_lineup_slots.match_id
      and teams.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = match_lineup_slots.match_id
      and teams.owner_user_id = auth.uid()
  )
);

create policy "leaders manage own bench"
on public.match_bench_players
for all
using (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = match_bench_players.match_id
      and teams.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = match_bench_players.match_id
      and teams.owner_user_id = auth.uid()
  )
);

create policy "leaders manage own unavailable list"
on public.match_unavailable_players
for all
using (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = match_unavailable_players.match_id
      and teams.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = match_unavailable_players.match_id
      and teams.owner_user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('player-images', 'player-images', true)
on conflict (id) do nothing;

create policy "leaders upload player images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'player-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "leaders read player images"
on storage.objects
for select
using (bucket_id = 'player-images');
