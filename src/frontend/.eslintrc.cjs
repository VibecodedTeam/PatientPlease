module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: {
    browser: true,
    es2022: true,
    jest: true,
    node: true,
  },
  extends: ['eslint:recommended'],
  plugins: ['react'],
  rules: {
    'no-unused-vars': ['error', { varsIgnorePattern: '^React$' }],
    'react/jsx-uses-vars': 'error',
  },
  ignorePatterns: ['node_modules', 'dist', 'coverage'],
};
