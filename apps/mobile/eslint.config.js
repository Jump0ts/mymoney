const expoConfig = require('eslint-config-expo/flat');

const nodeGlobals = {
  require: 'readonly',
  module: 'writable',
  process: 'readonly',
  console: 'readonly',
  __dirname: 'readonly',
};

const jestGlobals = {
  describe: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  jest: 'readonly',
};

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // Scripts de build (CommonJS que corre en Node, no en la app).
    files: ['scripts/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: nodeGlobals },
  },
  {
    files: ['scripts/**/*.test.js'],
    languageOptions: { globals: { ...nodeGlobals, ...jestGlobals } },
  },
];
