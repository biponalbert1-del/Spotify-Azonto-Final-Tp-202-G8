insert into public.artists (name, region)
select name, region
from (
  values
    ('Fally Ipupa', 'RDC'),
    ('Michael Jackson', 'USA'),
    ('Nelly', 'USA'),
    ('Serge Beynaud', 'Cote d''Ivoire')
) as seed_artists(name, region)
where not exists (
  select 1
  from public.artists
  where artists.name = seed_artists.name
);
