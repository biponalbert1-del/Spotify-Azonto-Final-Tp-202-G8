create table if not exists public.group_playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  access_code char(5) not null check (access_code ~ '^[0-9]{5}$'),
  owner_id uuid references auth.users(id) on delete set null,
  member_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_playlist_songs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_playlists(id) on delete cascade,
  song_key text not null,
  title text not null,
  artist text not null,
  genre text,
  region text,
  cover_url text,
  audio_source text,
  duration text default '0:00',
  plays_label text default 'Groupe',
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (group_id, song_key)
);

create index if not exists group_playlist_songs_group_id_idx
  on public.group_playlist_songs(group_id);

alter table public.group_playlists enable row level security;
alter table public.group_playlist_songs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_playlists'
      and policyname = 'group playlists are readable'
  ) then
    create policy "group playlists are readable"
      on public.group_playlists for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_playlists'
      and policyname = 'group playlists can be created'
  ) then
    create policy "group playlists can be created"
      on public.group_playlists for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_playlists'
      and policyname = 'group playlists can update member count'
  ) then
    create policy "group playlists can update member count"
      on public.group_playlists for update
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_playlist_songs'
      and policyname = 'group playlist songs are readable'
  ) then
    create policy "group playlist songs are readable"
      on public.group_playlist_songs for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_playlist_songs'
      and policyname = 'group playlist songs can be inserted'
  ) then
    create policy "group playlist songs can be inserted"
      on public.group_playlist_songs for insert
      with check (true);
  end if;
end $$;
