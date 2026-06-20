create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  safe_username text;
begin
  requested_username := nullif(new.raw_user_meta_data->>'username', '');

  if requested_username is not null
    and not exists (
      select 1
      from public.profiles
      where profiles.username = requested_username
        and profiles.id <> new.id
    )
  then
    safe_username := requested_username;
  else
    safe_username := null;
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    username,
    phone,
    country
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Utilisateur'),
    safe_username,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'country'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    username = excluded.username,
    phone = excluded.phone,
    country = excluded.country,
    updated_at = now();

  return new;
end;
$$;

insert into public.profiles (
  id,
  email,
  full_name,
  username,
  phone,
  country,
  created_at,
  updated_at
)
select
  users.id,
  coalesce(users.email, ''),
  coalesce(users.raw_user_meta_data->>'full_name', users.email, 'Utilisateur'),
  case
    when nullif(users.raw_user_meta_data->>'username', '') is not null
      and not exists (
        select 1
        from public.profiles
        where profiles.username = users.raw_user_meta_data->>'username'
          and profiles.id <> users.id
      )
      and row_number() over (
        partition by nullif(users.raw_user_meta_data->>'username', '')
        order by users.created_at, users.id
      ) = 1
    then users.raw_user_meta_data->>'username'
    else null
  end,
  users.raw_user_meta_data->>'phone',
  users.raw_user_meta_data->>'country',
  coalesce(users.created_at, now()),
  now()
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
)
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  username = excluded.username,
  phone = excluded.phone,
  country = excluded.country,
  updated_at = now();
