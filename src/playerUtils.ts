import {Image, ImageSourcePropType} from 'react-native';
import {defaultCover} from './mediaAssets';
import {RemoteSong} from './services/supabase';
import {LocalSong, Track} from './types';

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function durationToSeconds(duration: string): number {
  const [minutes = '0', seconds = '0'] = duration.split(':');
  return Number(minutes) * 60 + Number(seconds);
}

export function mapRemoteSong(song: RemoteSong): Track {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    genre: song.genre,
    region: song.region,
    cover: song.cover_url ?? '',
    audio: song.audio_url ?? undefined,
    duration: song.duration,
    plays: song.plays_label,
    liked: song.is_featured,
  };
}

export function mapLocalSong(song: LocalSong): Track {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist || 'Telephone',
    genre: 'Local',
    region: song.album || 'Telephone',
    album: song.album,
    cover: defaultCover,
    audio: song.uri,
    mimeType: song.mimeType,
    duration: song.durationMs ? formatTime(song.durationMs / 1000) : '0:00',
    plays: 'Local',
  };
}

export function coverSource(cover?: ImageSourcePropType | string): ImageSourcePropType {
  if (!cover) {
    return defaultCover;
  }

  if (typeof cover === 'string') {
    return {uri: cover};
  }

  return cover;
}

export function audioSource(audio?: number | string): string | null {
  if (!audio) {
    return null;
  }

  if (typeof audio === 'number') {
    return Image.resolveAssetSource(audio)?.uri ?? null;
  }

  return audio;
}
