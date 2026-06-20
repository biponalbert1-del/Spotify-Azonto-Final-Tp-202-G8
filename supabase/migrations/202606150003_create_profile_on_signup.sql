create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
    new.raw_user_meta_data->>'username',
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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
