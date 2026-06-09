import React from 'react';
import {act, create, ReactTestRenderer} from 'react-test-renderer';

import App from '../App';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-sound', () => {
  return class SoundMock {
    static setCategory = jest.fn();
    static MAIN_BUNDLE = '';

    constructor(_source: unknown, _basePath: unknown, callback?: (error: Error | null) => void) {
      if (callback) {
        callback(null);
      }
    }

    play = jest.fn((callback?: (success: boolean) => void) => callback && callback(true));
    pause = jest.fn();
    stop = jest.fn((callback?: () => void) => callback && callback());
    release = jest.fn();
    getDuration = jest.fn(() => 0);
    getCurrentTime = jest.fn((callback: (seconds: number) => void) => callback(0));
    setCurrentTime = jest.fn();
  };
});

test('renders Azonto app', async () => {
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(<App />);
  });

  expect(renderer?.toJSON()).toBeTruthy();
});
