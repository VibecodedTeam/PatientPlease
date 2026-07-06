module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  passWithNoTests: true,
  globals: {
    'ts-jest': {
      tsconfig: {
        types: ['jest'],
      },
    },
  },
};
