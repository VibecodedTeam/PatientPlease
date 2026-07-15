module.exports = {
  roots: ['<rootDir>/src/tests'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.module\\.css$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.jsx?$': 'esbuild-jest',
  },
  // pnpm nests real packages under node_modules/.pnpm/<pkg>@<version>/node_modules/<pkg>,
  // so both segments need to be excluded from the default node_modules ignore rule.
  transformIgnorePatterns: ['node_modules/(?!(\\.pnpm/three@|three/))'],
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
