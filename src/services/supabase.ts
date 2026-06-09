import type {GroupPlaylist, Track} from '../types';

const SUPABASE_URL = 'https://xvuwzzjsynihjttwryah.supabase.co';
const SUPABASE_ANON_KEY =
  'sb_publishable_wYwPz8nA3GQwJV0yGqEBqQ_w__1IeWl';

export type AuthProfileInput = {
  fullName: string;
  username: string;
  phone: string;
  country: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email?: string;
  };
  profile: AuthProfileInput;
};

export type RemoteSong = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  region: string;
  cover_url: string | null;
  audio_url: string | null;
  duration: string;
  plays_label: string;
  is_featured: boolean;
};

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email?: string;
  };
  error?: string;
  msg?: string;
};

type SupabaseSongRow = {
  id: string;
  title: string;
  genre: string | null;
  region: string | null;
  cover_url: string | null;
  audio_url: string | null;
  duration: string | null;
  plays_label: string | null;
  is_featured: boolean | null;
  artists?: {
    name?: string | null;
  } | null;
};

type SupabaseProfileRow = {
  full_name: string | null;
  username: string | null;
  phone: string | null;
  country: string | null;
};

type GroupPlaylistSongRow = {
  song_key: string;
  title: string;
  artist: string;
  genre: string | null;
  region: string | null;
  cover_url: string | null;
  audio_source: string | null;
  duration: string | null;
  plays_label: string | null;
};

type GroupPlaylistRow = {
  id: string;
  name: string;
  access_code: string;
  member_count: number | null;
  created_at: string;
  group_playlist_songs?: GroupPlaylistSongRow[];
};

const hasSupabaseConfig = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const authHeaders = (accessToken?: string) => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${accessToken ?? SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
});

async function requestAuth(
  path: 'signup' | 'token?grant_type=password',
  body: Record<string, unknown>,
): Promise<SupabaseAuthResponse> {
  if (!hasSupabaseConfig()) {
    throw new Error('Configuration Supabase manquante.');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as SupabaseAuthResponse;

  if (!response.ok) {
    throw new Error(data.error || data.msg || 'Requete Supabase impossible.');
  }

  return data;
}

async function upsertProfile(
  accessToken: string,
  userId: string,
  email: string,
  profile: AuthProfileInput,
) {
  if (!hasSupabaseConfig() || !accessToken) {
    return;
  }

  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: userId,
      email,
      full_name: profile.fullName,
      username: profile.username,
      phone: profile.phone,
      country: profile.country,
    }),
  });
}

async function getProfile(
  accessToken: string,
  userId: string,
  fallback: AuthProfileInput,
): Promise<AuthProfileInput> {
  if (!hasSupabaseConfig() || !accessToken || !userId) {
    return fallback;
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=full_name,username,phone,country&limit=1`,
    {headers: authHeaders(accessToken)},
  );

  if (!response.ok) {
    return fallback;
  }

  const rows = (await response.json()) as SupabaseProfileRow[];
  const profile = rows[0];
  if (!profile) {
    return fallback;
  }

  return {
    fullName: profile.full_name ?? fallback.fullName,
    username: profile.username ?? fallback.username,
    phone: profile.phone ?? fallback.phone,
    country: profile.country ?? fallback.country,
  };
}

function toSession(
  data: SupabaseAuthResponse,
  email: string,
  profile: AuthProfileInput,
): AuthSession {
  return {
    accessToken: data.access_token ?? '',
    refreshToken: data.refresh_token,
    user: {
      id: data.user?.id ?? '',
      email: data.user?.email ?? email,
    },
    profile,
  };
}

export async function signInWithEmail(
  email: string,
  password: string,
  profile: AuthProfileInput,
): Promise<AuthSession> {
  const data = await requestAuth('token?grant_type=password', {email, password});
  const session = toSession(data, email, profile);
  return {
    ...session,
    profile: await getProfile(session.accessToken, session.user.id, profile),
  };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  profile: AuthProfileInput,
): Promise<AuthSession> {
  const data = await requestAuth('signup', {
    email,
    password,
    data: {
      full_name: profile.fullName,
      username: profile.username,
      phone: profile.phone,
      country: profile.country,
    },
  });
  const session = toSession(data, email, profile);

  if (session.accessToken && session.user.id) {
    await upsertProfile(session.accessToken, session.user.id, email, profile);
  }

  return session;
}

export async function getRemoteSongs(): Promise<RemoteSong[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/songs?select=id,title,genre,region,cover_url,audio_url,duration,plays_label,is_featured,artists(name)&is_active=eq.true&order=created_at.desc`,
      {headers: authHeaders()},
    );

    if (!response.ok) {
      return [];
    }

    const songs = (await response.json()) as SupabaseSongRow[];
    return songs.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artists?.name ?? 'Artiste inconnu',
      genre: song.genre ?? 'Afro',
      region: song.region ?? 'Afrique',
      cover_url: song.cover_url,
      audio_url: song.audio_url,
      duration: song.duration ?? '0:00',
      plays_label: song.plays_label ?? 'Nouveau',
      is_featured: Boolean(song.is_featured),
    }));
  } catch {
    return [];
  }
}

function trackToGroupSong(groupId: string, track: Track, userId?: string) {
  const coverUrl = typeof track.cover === 'string' ? track.cover : null;
  const audioSource = typeof track.audio === 'string' ? track.audio : null;

  return {
    group_id: groupId,
    song_key: track.id,
    title: track.title,
    artist: track.artist,
    genre: track.genre,
    region: track.region,
    cover_url: coverUrl,
    audio_source: audioSource,
    duration: track.duration,
    plays_label: track.plays,
    added_by: userId ?? null,
  };
}

function mapGroupPlaylist(row: GroupPlaylistRow): GroupPlaylist {
  const tracks: Track[] = (row.group_playlist_songs ?? []).map(song => ({
    id: song.song_key,
    title: song.title,
    artist: song.artist,
    genre: song.genre ?? 'Groupe',
    region: song.region ?? 'Supabase',
    cover: song.cover_url ?? '',
    audio: song.audio_source ?? undefined,
    duration: song.duration ?? '0:00',
    plays: song.plays_label ?? 'Groupe',
  }));

  return {
    id: row.id,
    name: row.name,
    code: row.access_code,
    memberCount: row.member_count ?? 1,
    trackIds: tracks.map(track => track.id),
    tracks,
    createdAt: row.created_at,
  };
}

export async function getRemoteGroupPlaylists(): Promise<GroupPlaylist[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/group_playlists?select=id,name,access_code,member_count,created_at,group_playlist_songs(song_key,title,artist,genre,region,cover_url,audio_source,duration,plays_label)&order=created_at.desc`,
    {headers: authHeaders()},
  );

  if (!response.ok) {
    return [];
  }

  const rows = (await response.json()) as GroupPlaylistRow[];
  return rows.map(mapGroupPlaylist);
}

export async function createRemoteGroupPlaylist(
  session: AuthSession | null,
  name: string,
  code: string,
  tracks: Track[],
): Promise<GroupPlaylist | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const playlistResponse = await fetch(`${SUPABASE_URL}/rest/v1/group_playlists`, {
    method: 'POST',
    headers: {
      ...authHeaders(session?.accessToken),
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      name,
      access_code: code,
      owner_id: session?.user.id ?? null,
      member_count: 1,
    }),
  });

  if (!playlistResponse.ok) {
    return null;
  }

  const [playlist] = (await playlistResponse.json()) as GroupPlaylistRow[];
  if (!playlist) {
    return null;
  }

  await addSongsToRemoteGroupPlaylist(session, playlist.id, tracks);
  const groups = await getRemoteGroupPlaylists();
  return groups.find(group => group.id === playlist.id) ?? null;
}

export async function addSongsToRemoteGroupPlaylist(
  session: AuthSession | null,
  groupId: string,
  tracks: Track[],
) {
  if (!hasSupabaseConfig() || !tracks.length) {
    return;
  }

  await fetch(`${SUPABASE_URL}/rest/v1/group_playlist_songs`, {
    method: 'POST',
    headers: {
      ...authHeaders(session?.accessToken),
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(
      tracks.map(track => trackToGroupSong(groupId, track, session?.user.id)),
    ),
  });
}

export async function updateRemoteGroupMemberCount(groupId: string, memberCount: number) {
  if (!hasSupabaseConfig()) {
    return;
  }

  await fetch(`${SUPABASE_URL}/rest/v1/group_playlists?id=eq.${groupId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({member_count: memberCount}),
  });
}
