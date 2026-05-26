module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '\\.(mp3|m4a)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
