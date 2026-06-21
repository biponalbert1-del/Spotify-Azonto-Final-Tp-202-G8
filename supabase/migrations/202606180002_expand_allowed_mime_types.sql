-- Update storage buckets to allow more mime types and ensure generous file size limit
do $$
begin
  -- song-audio bucket
  update storage.buckets
  set 
    allowed_mime_types = array[
      'audio/mpeg', 
      'audio/mp4', 
      'audio/x-m4a', 
      'audio/ogg', 
      'audio/wav', 
      'audio/webm', 
      'audio/aac', 
      'audio/flac', 
      'audio/x-wav',
      'audio/mp3'
    ],
    file_size_limit = 52428800 -- 50MB
  where id = 'song-audio';

  -- song-covers bucket
  update storage.buckets
  set 
    allowed_mime_types = array[
      'image/jpeg', 
      'image/png', 
      'image/webp', 
      'image/gif', 
      'image/svg+xml'
    ],
    file_size_limit = 10485760 -- 10MB
  where id = 'song-covers';
end $$;
