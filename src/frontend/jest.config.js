module.exports = {
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
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
