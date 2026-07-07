module.exports = {
  roots: ['<rootDir>/tests'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.module\\.css$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.jsx?$': 'esbuild-jest',
  },
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Without this, Jest keeps node_modules packages (e.g. axios) cached
  // across test files. A package whose code closes over bare globals like
  // `fetch` then stays permanently bound to whichever test file's jsdom
  // global was active the first time it was required — so every other
  // file's `global.fetch` mock silently has no effect on it, causing
  // intermittent real-network AggregateErrors in unrelated test files.
  resetModules: true,
};
