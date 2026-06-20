-- Ensure storage policies are explicit and fully open for the prototype
-- We drop and recreate to ensure they are updated
do $$
begin
  -- song-audio bucket
  drop policy if exists "Public Access for song-audio" on storage.objects;
  drop policy if exists "Allow public uploads to song-audio" on storage.objects;
  drop policy if exists "Allow public updates to song-audio" on storage.objects;
  drop policy if exists "song audio is publicly readable" on storage.objects;

  create policy "Public Access for song-audio"
    on storage.objects for all
    using (bucket_id = 'song-audio')
    with check (bucket_id = 'song-audio');

  -- song-covers bucket
  drop policy if exists "Public Access for song-covers" on storage.objects;
  drop policy if exists "Allow public uploads to song-covers" on storage.objects;
  drop policy if exists "Allow public updates to song-covers" on storage.objects;
  drop policy if exists "song covers are publicly readable" on storage.objects;

  create policy "Public Access for song-covers"
    on storage.objects for all
    using (bucket_id = 'song-covers')
    with check (bucket_id = 'song-covers');
end $$;

-- Ensure public buckets are actually public and have a large enough limit (50MB)
update storage.buckets 
set public = true, file_size_limit = 52428800 
where id in ('song-audio', 'song-covers');

-- Ensure group playlists and songs are also wide open for the prototype
alter table public.group_playlists enable row level security;
alter table public.group_playlist_songs enable row level security;

do $$
begin
  drop policy if exists "Enable all for group_playlists" on public.group_playlists;
  create policy "Enable all for group_playlists" on public.group_playlists
    for all using (true) with check (true);

  drop policy if exists "Enable all for group_playlist_songs" on public.group_playlist_songs;
  create policy "Enable all for group_playlist_songs" on public.group_playlist_songs
    for all using (true) with check (true);
end $$;

-- Explicitly grant permissions to anon and authenticated roles
grant all on table public.group_playlists to anon, authenticated;
grant all on table public.group_playlist_songs to anon, authenticated;
grant all on table public.profiles to anon, authenticated;
grant all on table public.songs to anon, authenticated;
grant all on usage on schema public to anon, authenticated;
