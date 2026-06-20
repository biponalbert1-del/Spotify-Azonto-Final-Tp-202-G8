import type {ArtistSongPayload, AuthStatus, GroupMember, GroupPlaylist, Track} from '../types';

export const SUPABASE_URL = 'https://xvuwzzjsynihjttwryah.supabase.co';
export const SUPABASE_ANON_KEY =
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
  error_description?: string;
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

type ArtistRow = {
  id: string;
  name: string;
  region: string | null;
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

type GroupPlaylistMemberRow = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  joined_at: string;
};

type GroupPlaylistRow = {
  id: string;
  name: string;
  access_code: string;
  owner_id: string | null;
  member_count: number | null;
  created_at: string;
  group_playlist_songs?: GroupPlaylistSongRow[];
  group_playlist_members?: GroupPlaylistMemberRow[];
};

const hasSupabaseConfig = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const authHeaders = (accessToken?: string) => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
});
const jsonHeaders = (accessToken?: string) => ({
  ...authHeaders(accessToken),
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
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as SupabaseAuthResponse;

  if (!response.ok) {
    const errorMsg = data.error_description || data.error || data.msg || 'Requete Supabase impossible.';
    throw new Error(errorMsg);
  }

  return data;
}

async function upsertProfile(
  accessToken: string,
  userId: string,
  email: string,
  profile: AuthProfileInput,
) {
  if (!hasSupabaseConfig()) {
    return;
  }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        ...jsonHeaders(accessToken || undefined),
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: userId,
        email,
        full_name: profile.fullName || 'Utilisateur',
        username: profile.username || null,
        phone: profile.phone || null,
        country: profile.country || null,
      }),
    });
  } catch (err) {
    // Fail silently in production
  }
}

export async function getProfile(
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
    fullName: profile.full_name || fallback.fullName,
    username: profile.username || fallback.username,
    phone: profile.phone || fallback.phone,
    country: profile.country || fallback.country,
  };
}

function toSession(
  data: SupabaseAuthResponse,
  email: string,
  profile: AuthProfileInput,
): AuthSession {
  const meta = (data.user as any)?.user_metadata;
  return {
    accessToken: data.access_token ?? '',
    refreshToken: data.refresh_token,
    user: {
      id: data.user?.id ?? '',
      email: data.user?.email ?? email,
    },
    profile: {
      fullName: profile.fullName || meta?.full_name || meta?.fullName || '',
      username: profile.username || meta?.username || '',
      phone: profile.phone || meta?.phone || '',
      country: profile.country || meta?.country || '',
    },
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
    profile: await getProfile(session.accessToken, session.user.id, session.profile),
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

  if (session.user.id) {
    await upsertProfile(session.accessToken, session.user.id, email, profile);
  }

  return session;
}

export async function refreshAuthSession(
  session: AuthSession | null,
): Promise<AuthSession | null> {
  if (!hasSupabaseConfig() || !session?.refreshToken) {
    return session;
  }

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({refresh_token: session.refreshToken}),
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as SupabaseAuthResponse;
  return {
    accessToken: data.access_token ?? '',
    refreshToken: data.refresh_token ?? session.refreshToken,
    user: {
      id: data.user?.id ?? session.user.id,
      email: data.user?.email ?? session.user.email,
    },
    profile: session.profile,
  };
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

export async function createRemoteArtistSong(
  session: AuthSession | null,
  payload: ArtistSongPayload,
): Promise<RemoteSong | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const artistName = payload.artist.trim();
  const title = payload.title.trim();
  const genre = payload.type.trim();
  const region = payload.origin.trim() || 'Studio';

  if (!artistName || !title || !payload.audio.trim()) {
    return null;
  }

  const artistResponse = await fetch(`${SUPABASE_URL}/rest/v1/artists`, {
    method: 'POST',
    headers: {
      ...jsonHeaders(session?.accessToken),
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      name: artistName,
      region,
    }),
  });

  if (!artistResponse.ok) {
    return null;
  }

  const [artist] = (await artistResponse.json()) as ArtistRow[];
  if (!artist) {
    return null;
  }

  const songResponse = await fetch(`${SUPABASE_URL}/rest/v1/songs`, {
    method: 'POST',
    headers: {
      ...jsonHeaders(session?.accessToken),
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      artist_id: artist.id,
      title,
      genre: genre || 'Afro-pop',
      region,
      cover_url: payload.image.trim() || null,
      audio_url: payload.audio.trim(),
      duration: '0:00',
      plays_label: 'Nouveau',
      is_active: true,
      is_featured: false,
    }),
  });

  if (!songResponse.ok) {
    return null;
  }

  const [song] = (await songResponse.json()) as SupabaseSongRow[];
  if (!song) {
    return null;
  }

  return {
    id: song.id,
    title: song.title,
    artist: artist.name,
    genre: song.genre ?? genre,
    region: song.region ?? region,
    cover_url: song.cover_url,
    audio_url: song.audio_url,
    duration: song.duration ?? '0:00',
    plays_label: song.plays_label ?? 'Nouveau',
    is_featured: Boolean(song.is_featured),
  };
}

function trackToGroupSong(groupId: string, track: Track, userId?: string) {
  const coverUrl = typeof track.cover === 'string' ? track.cover : null;
  const audioSource = typeof track.audio === 'string' ? track.audio : null;

  return {
    group_id: groupId,
    song_key: track.id,
    title: track.title?.trim() || 'Titre inconnu',
    artist: track.artist?.trim() || 'Artiste inconnu',
    genre: track.genre?.trim() || null,
    region: track.region?.trim() || null,
    cover_url: coverUrl,
    audio_source: audioSource,
    duration: track.duration?.trim() || '0:00',
    plays_label: track.plays?.trim() || 'Groupe',
    added_by: userId || null,
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

  const members: GroupMember[] = (row.group_playlist_members ?? []).map(member => ({
    id: member.id,
    userId: member.user_id,
    displayName: member.display_name ?? 'Membre',
    joinedAt: member.joined_at,
  }));

  return {
    id: row.id,
    name: row.name,
    code: row.access_code,
    memberCount: row.member_count ?? 1,
    ownerId: row.owner_id,
    trackIds: tracks.map(track => track.id),
    tracks,
    members,
    createdAt: row.created_at,
  };
}

export async function getRemoteGroupPlaylists(): Promise<GroupPlaylist[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/group_playlists?select=id,name,access_code,owner_id,member_count,created_at,group_playlist_songs(song_key,title,artist,genre,region,cover_url,audio_source,duration,plays_label),group_playlist_members(id,user_id,display_name,joined_at)&order=created_at.desc`,
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
  displayName: string,
  onProgress?: (sent: number, total: number, message: string) => void,
): Promise<GroupPlaylist | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const createPlaylist = (accessToken?: string, ownerId?: string) =>
    fetch(`${SUPABASE_URL}/rest/v1/group_playlists`, {
    method: 'POST',
    headers: {
        ...jsonHeaders(accessToken),
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      name,
      access_code: code,
      owner_id: ownerId || null,
      member_count: 1,
    }),
  });

  let playlistResponse = await createPlaylist(
    session?.accessToken,
    session?.user.id,
  );

  if (!playlistResponse.ok && session?.accessToken) {
    playlistResponse = await createPlaylist(undefined, undefined);
  }

  if (!playlistResponse.ok) {
    throw new Error(await responseError('Creation groupe Supabase impossible', playlistResponse));
  }

  const playlistPayload = await playlistResponse.json();
  const playlist = Array.isArray(playlistPayload)
    ? (playlistPayload[0] as GroupPlaylistRow)
    : (playlistPayload as GroupPlaylistRow);

  if (!playlist) {
    return null;
  }

  await addRemoteGroupMember(
    session,
    playlist.id,
    displayName,
  );

  const songsAdded = await addSongsToRemoteGroupPlaylist(
    session,
    playlist.id,
    tracks,
    onProgress,
  );
  if (!songsAdded) {
    throw new Error('Ajout des songs Supabase impossible.');
  }

  const member = {
    id: `member-${Date.now()}`,
    userId: session?.user.id ?? null,
    displayName,
    joinedAt: new Date().toISOString(),
  };

  return {
    id: playlist.id,
    name: playlist.name,
    code: playlist.access_code,
    memberCount: 1,
    ownerId: playlist.owner_id,
    trackIds: tracks.map(track => track.id),
    tracks,
    members: [member],
    createdAt: playlist.created_at,
  };
}


export async function addSongsToRemoteGroupPlaylist(
  session: AuthSession | null,
  groupId: string,
  tracks: Track[],
  onProgress?: (sent: number, total: number, message: string) => void,
) {
  if (!hasSupabaseConfig() || !tracks.length) {
    return false;
  }

  const trackRows = tracks.map(track =>
    trackToGroupSong(groupId, track, session?.user.id),
  );

  onProgress?.(0, tracks.length, `Envoi Supabase: ${tracks.length} song(s)`);

  let response = await fetch(`${SUPABASE_URL}/rest/v1/group_playlist_songs`, {
    method: 'POST',
    headers: {
      ...jsonHeaders(session?.accessToken),
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify(trackRows),
  });

  if (!response.ok && session?.accessToken) {
    response = await fetch(`${SUPABASE_URL}/rest/v1/group_playlist_songs`, {
      method: 'POST',
      headers: {
        ...jsonHeaders(),
        Prefer: 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify(trackRows),
    });
  }

  if (!response.ok) {
    throw new Error(await responseError('Ajout song Supabase impossible', response));
  }

  onProgress?.(tracks.length, tracks.length, `${tracks.length}/${tracks.length} song envoye`);
  return true;
}

export async function addRemoteGroupMember(
  session: AuthStatus | AuthSession | null,
  groupId: string,
  displayName: string,
) {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const s = session && typeof session === 'object' && 'accessToken' in session ? session : null;

  let response = await fetch(`${SUPABASE_URL}/rest/v1/group_playlist_members`, {
    method: 'POST',
    headers: {
      ...jsonHeaders(s?.accessToken),
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      group_id: groupId,
      user_id: s?.user.id || null,
      display_name: displayName || 'Membre',
    }),
  });

  if (!response.ok && s?.accessToken) {
    response = await fetch(`${SUPABASE_URL}/rest/v1/group_playlist_members`, {
      method: 'POST',
      headers: {
        ...jsonHeaders(),
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        group_id: groupId,
        user_id: undefined,
        display_name: displayName || 'Membre',
      }),
    });
  }

  return response.ok;
}

async function responseError(prefix: string, response: Response) {
  const text = await response.text().catch(() => '');
  return `${prefix} (${response.status})${text ? `: ${text.slice(0, 180)}` : ''}`;
}

export async function deleteRemoteGroupPlaylist(
  session: AuthSession | null,
  groupId: string,
) {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/group_playlists?id=eq.${groupId}`, {
    method: 'DELETE',
    headers: authHeaders(session?.accessToken),
  });

  return response.ok;
}

export async function updateRemoteGroupMemberCount(groupId: string, memberCount: number) {
  if (!hasSupabaseConfig()) {
    return;
  }

  await fetch(`${SUPABASE_URL}/rest/v1/group_playlists?id=eq.${groupId}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({member_count: memberCount}),
  });
}

export async function createRemoteGroupNotification(
  groupId: string,
  userId: string,
  title: string,
  message: string,
) {
  if (!hasSupabaseConfig()) {
    return;
  }
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/group_notifications`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        group_id: groupId,
        user_id: userId,
        title,
        message,
      }),
    });
  } catch (err) {
    // Fail silently
  }
}

export async function getRemoteGroupNotifications(groupIds: string[]): Promise<any[]> {
  if (!hasSupabaseConfig() || !groupIds.length) {
    return [];
  }
  const idList = groupIds.join(',');
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/group_notifications?group_id=in.(${idList})&order=created_at.desc&limit=50`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
      },
    },
  );
  if (!response.ok) {
    return [];
  }
  return (await response.json()) as any[];
}
