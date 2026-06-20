import type {ImageSourcePropType} from 'react-native';
import type {AuthProfileInput} from './services/supabase';

export type TabKey = 'home' | 'explore' | 'search' | 'library' | 'profile';

export type Track = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  region: string;
  album?: string;
  cover: ImageSourcePropType | string;
  audio?: number | string;
  mimeType?: string;
  duration: string;
  plays: string;
  liked?: boolean;
};

export type LocalSong = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  uri: string;
  mimeType?: string;
  durationMs?: number;
};

export type PhoneFile = {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
};

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
};

export type GroupPlaylist = Playlist & {
  code: string;
  memberCount: number;
  ownerId?: string | null;
  tracks?: Track[];
  members?: GroupMember[];
  syncError?: string;
};

export type GroupMember = {
  id: string;
  userId?: string | null;
  displayName: string;
  joinedAt: string;
};

export type GroupSyncProgress = {
  active: boolean;
  message: string;
  sent: number;
  total: number;
};

export type AuthStatus = 'guest' | 'signed-in' | 'registered' | 'verifying';

export type AuthSubmitPayload = AuthProfileInput & {
  email: string;
  password: string;
};

export type ArtistSongPayload = {
  artist: string;
  title: string;
  album: string;
  origin: string;
  type: string;
  image: string;
  audio: string;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
};
