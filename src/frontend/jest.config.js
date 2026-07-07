module.exports = {
  roots: ['<rootDir>/tests'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.module\\.css$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.jsx?$': 'esbuild-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
