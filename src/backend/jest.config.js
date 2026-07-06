module.exports = {
  testEnvironment: 'node',
  passWithNoTests: true,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { types: ['jest'] } }],
  },
};
