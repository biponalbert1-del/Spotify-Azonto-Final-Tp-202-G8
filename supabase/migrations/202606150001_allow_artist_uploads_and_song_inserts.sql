update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'song-covers';

update storage.buckets
set allowed_mime_types = array[
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav'
]
where id = 'song-audio';

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'song covers can be uploaded'
  ) then
    create policy "song covers can be uploaded"
      on storage.objects for insert
      with check (bucket_id = 'song-covers');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'song audio can be uploaded'
  ) then
    create policy "song audio can be uploaded"
      on storage.objects for insert
      with check (bucket_id = 'song-audio');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'song uploads can be replaced'
  ) then
    create policy "song uploads can be replaced"
      on storage.objects for update
      using (bucket_id in ('song-covers', 'song-audio'))
      with check (bucket_id in ('song-covers', 'song-audio'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'artists'
      and policyname = 'artists can be created'
  ) then
    create policy "artists can be created"
      on public.artists for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'songs'
      and policyname = 'songs can be created'
  ) then
    create policy "songs can be created"
      on public.songs for insert
      with check (true);
  end if;
end $$;
