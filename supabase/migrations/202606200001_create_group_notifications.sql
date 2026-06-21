create table if not exists public.group_notifications (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_playlists(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists group_notifications_group_id_idx
  on public.group_notifications(group_id);

alter table public.group_notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_notifications'
      and policyname = 'group notifications are readable by all'
  ) then
    create policy "group notifications are readable by all"
      on public.group_notifications for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'group_notifications'
      and policyname = 'group notifications can be inserted'
  ) then
    create policy "group notifications can be inserted"
      on public.group_notifications for insert
      with check (true);
  end if;
end $$;

grant all on table public.group_notifications to anon, authenticated;
