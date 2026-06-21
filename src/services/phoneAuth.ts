import {NativeModules, NativeEventEmitter} from 'react-native';

const {PhoneAuthModule} = NativeModules;
const phoneAuthEmitter = new NativeEventEmitter(PhoneAuthModule);

export type PhoneAuthUser = {
  uid: string;
  phoneNumber: string;
};

export const verifyPhoneNumber = (phoneNumber: string) => {
  PhoneAuthModule.verifyPhoneNumber(phoneNumber);
};

export const signInWithCode = (code: string): Promise<PhoneAuthUser> => {
  return PhoneAuthModule.signInWithCode(code);
};

export const subscribeToPhoneAuthEvents = (callbacks: {
  onCodeSent?: (verificationId: string) => void;
  onVerificationCompleted?: (code: string | null) => void;
  onVerificationFailed?: (message: string) => void;
  onSignInSuccess?: (user: PhoneAuthUser) => void;
  onSignInFailure?: (message: string) => void;
}) => {
  const subscriptions = [
    phoneAuthEmitter.addListener('onCodeSent', (data) => callbacks.onCodeSent?.(data.verificationId)),
    phoneAuthEmitter.addListener('onVerificationCompleted', (data) => callbacks.onVerificationCompleted?.(data.code)),
    phoneAuthEmitter.addListener('onVerificationFailed', (data) => callbacks.onVerificationFailed?.(data.message)),
    phoneAuthEmitter.addListener('onSignInSuccess', (data) => callbacks.onSignInSuccess?.(data)),
    phoneAuthEmitter.addListener('onSignInFailure', (data) => callbacks.onSignInFailure?.(data.message)),
  ];

  return () => {
    subscriptions.forEach(sub => sub.remove());
  };
};
