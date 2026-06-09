import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import {LocalSong} from '../types';

const {LocalSongs} = NativeModules as {
  LocalSongs?: {
    getSongs: () => Promise<LocalSong[]>;
    prepareSong: (id: string, uri: string) => Promise<string>;
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
