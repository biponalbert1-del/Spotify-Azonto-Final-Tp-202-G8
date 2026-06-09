insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('song-covers', 'song-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('song-audio', 'song-audio', true, 20971520, array['audio/mpeg', 'audio/mp4', 'audio/x-m4a'])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'song covers are publicly readable'
  ) then
    create policy "song covers are publicly readable"
      on storage.objects for select
      using (bucket_id = 'song-covers');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'song audio is publicly readable'
  ) then
    create policy "song audio is publicly readable"
      on storage.objects for select
      using (bucket_id = 'song-audio');
  end if;
end $$;
