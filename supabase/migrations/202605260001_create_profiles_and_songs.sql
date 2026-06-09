create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  username text,
  phone text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  created_at timestamptz not null default now()
);

alter table public.artists
  add column if not exists region text;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete set null,
  title text not null,
  genre text,
  region text,
  cover_url text,
  audio_url text,
  duration text default '0:00',
  plays_label text default 'Nouveau',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_favorite_songs (
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlist_songs (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (playlist_id, song_id)
);

create index if not exists songs_artist_id_idx on public.songs(artist_id);
create index if not exists songs_active_idx on public.songs(is_active);
create index if not exists songs_genre_idx on public.songs(genre);
create index if not exists songs_region_idx on public.songs(region);
create index if not exists playlists_user_id_idx on public.playlists(user_id);

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.songs enable row level security;
alter table public.user_favorite_songs enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles are owned by user'
  ) then
    create policy "profiles are owned by user"
      on public.profiles for all
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'artists'
      and policyname = 'artists are public'
  ) then
    create policy "artists are public"
      on public.artists for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'songs'
      and policyname = 'active songs are public'
  ) then
    create policy "active songs are public"
      on public.songs for select
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_favorite_songs'
      and policyname = 'favorite songs are owned by user'
  ) then
    create policy "favorite songs are owned by user"
      on public.user_favorite_songs for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'playlists'
      and policyname = 'playlists readable by owner or public'
  ) then
    create policy "playlists readable by owner or public"
      on public.playlists for select
      using (auth.uid() = user_id or is_public = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'playlists'
      and policyname = 'playlists are owned by user'
  ) then
    create policy "playlists are owned by user"
      on public.playlists for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'playlist_songs'
      and policyname = 'playlist songs readable through playlists'
  ) then
    create policy "playlist songs readable through playlists"
      on public.playlist_songs for select
      using (
        exists (
          select 1 from public.playlists
          where playlists.id = playlist_songs.playlist_id
          and (playlists.user_id = auth.uid() or playlists.is_public = true)
        )
      );
  end if;
end $$;
