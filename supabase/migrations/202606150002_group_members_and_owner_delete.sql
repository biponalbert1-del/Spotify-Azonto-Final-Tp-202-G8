create table if not exists public.group_playlist_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_playlists(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null default 'Membre',
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists group_playlist_members_group_id_idx
  on public.group_playlist_members(group_id);

alter table public.group_playlist_members enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_playlist_members'
      and policyname = 'group members are readable'
  ) then
    create policy "group members are readable"
      on public.group_playlist_members for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_playlist_members'
      and policyname = 'group members can be inserted'
  ) then
    create policy "group members can be inserted"
      on public.group_playlist_members for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_playlists'
      and policyname = 'group owner can delete playlist'
  ) then
    create policy "group owner can delete playlist"
      on public.group_playlists for delete
      using (owner_id = auth.uid());
  end if;
end $$;
