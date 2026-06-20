import {
  DeviceEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

const {PlayerNotification} = NativeModules as {
  PlayerNotification?: {
    show: (
      title: string,
      artist: string,
      position: number,
      duration: number,
      isPlaying: boolean,
    ) => void;
    alert: (title: string, message: string) => void;
    hide: () => void;
  };
};

export async function requestNotificationPermission() {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true;
  }

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  const granted = await PermissionsAndroid.check(permission);
  if (granted) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function showPlayerNotification({
  title,
  artist,
  position,
  duration,
  isPlaying,
}: {
  title: string;
  artist: string;
  position: number;
  duration: number;
  isPlaying: boolean;
}) {
  if (!PlayerNotification) {
    return;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    return;
  }

  PlayerNotification.show(title, artist, position, duration, isPlaying);
}

export function hidePlayerNotification() {
  PlayerNotification?.hide();
}

export async function showAppNotification(title: string, message: string) {
  if (!PlayerNotification) {
    return;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    return;
  }

  PlayerNotification.alert(title, message);
}

export function subscribePlayerNotification(
  listener: (action: 'previous' | 'toggle' | 'next') => void,
) {
  return DeviceEventEmitter.addListener('AzontoPlayerNotificationAction', listener);
}
