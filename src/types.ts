import type {ImageSourcePropType} from 'react-native';
import type {AuthProfileInput} from './services/supabase';

export type TabKey = 'home' | 'explore' | 'search' | 'library' | 'profile';

export type Track = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  region: string;
  cover: ImageSourcePropType | string;
  audio?: number | string;
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
  durationMs?: number;
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
  tracks?: Track[];
};

export type AuthStatus = 'guest' | 'signed-in' | 'registered';

export type AuthSubmitPayload = AuthProfileInput & {
  email: string;
  password: string;
};
