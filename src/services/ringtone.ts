import {NativeModules} from 'react-native';

const {RingtoneTools} = NativeModules as {
  RingtoneTools?: {
    setRingtone: (title: string, source: string) => Promise<boolean>;
  };
};

export async function setTrackAsRingtone(title: string, source: string) {
  if (!RingtoneTools) {
    throw new Error('Module sonnerie indisponible.');
  }

  return RingtoneTools.setRingtone(title, source);
}
