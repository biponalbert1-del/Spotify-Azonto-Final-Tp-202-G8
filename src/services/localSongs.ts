import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import {SUPABASE_ANON_KEY, SUPABASE_URL} from './supabase';
import {LocalSong, PhoneFile} from '../types';

const {LocalSongs} = NativeModules as {
  LocalSongs?: {
    getSongs: () => Promise<LocalSong[]>;
    prepareSong: (id: string, uri: string) => Promise<string>;
    pickFile: (kind: 'image' | 'audio') => Promise<PhoneFile | null>;
    uploadFileToSupabase: (
      supabaseUrl: string,
      anonKey: string,
      accessToken: string,
      bucket: string,
      path: string,
      uri: string,
      mimeType: string,
    ) => Promise<{bucket: string; path: string; publicUrl: string}>;
    downloadFile: (url: string, fileName: string) => Promise<boolean>;
  };
};

async function requestLocalAudioPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permission =
    Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission, {
    title: 'Acces aux musiques',
    message: 'Azonto doit lire les sons stockes sur ton telephone.',
    buttonPositive: 'Autoriser',
    buttonNegative: 'Annuler',
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function getPhoneSongs() {
  if (!LocalSongs) {
    return [];
  }

  const granted = await requestLocalAudioPermission();
  if (!granted) {
    return [];
  }

  return LocalSongs.getSongs();
}

export async function preparePhoneSong(id: string, uri: string) {
  if (!LocalSongs || !uri.startsWith('content://')) {
    return uri;
  }

  return LocalSongs.prepareSong(id, uri);
}

export async function pickPhoneFile(kind: 'image' | 'audio') {
  if (!LocalSongs?.pickFile) {
    return null;
  }

  return LocalSongs.pickFile(kind);
}

export async function uploadPhoneFileToSupabase(
  file: PhoneFile,
  bucket: 'song-covers' | 'song-audio',
  folder: string,
  accessToken?: string,
) {
  if (!LocalSongs?.uploadFileToSupabase) {
    return '';
  }

  const mimeType =
    file.mimeType ||
    (bucket === 'song-covers' ? 'image/jpeg' : 'audio/mpeg');
  const path = `${folder}/${Date.now()}-${safeFileName(file.name, mimeType)}`;
  const result = await LocalSongs.uploadFileToSupabase(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    accessToken ?? '',
    bucket,
    path,
    file.uri,
    mimeType,
  );

  return result.publicUrl;
}

export async function downloadPhoneFile(url: string, fileName: string) {
  if (!LocalSongs?.downloadFile) {
    return false;
  }

  return LocalSongs.downloadFile(url, fileName);
}

function safeFileName(name: string, mimeType: string) {
  const cleanName = name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (cleanName.includes('.')) {
    return cleanName;
  }

  return `${cleanName || 'file'}.${extensionFromMime(mimeType)}`;
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes('png')) {
    return 'png';
  }

  if (mimeType.includes('webp')) {
    return 'webp';
  }

  if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
    return 'm4a';
  }

  if (mimeType.includes('wav')) {
    return 'wav';
  }

  return mimeType.startsWith('image/') ? 'jpg' : 'mp3';
}
