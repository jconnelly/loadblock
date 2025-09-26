module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Error prevention
    'no-unused-vars': 'error',
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',

    // Code style
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',

    // Best practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // Complexity
    'complexity': ['error', 10],
    'max-depth': ['error', 4],
    'max-len': ['error', { code: 100, ignoreUrls: true }],
    'max-lines-per-function': ['error', 50],

    // Security
    'no-new-require': 'error',
    'no-path-concat': 'error',

    // Async/await
    'require-await': 'error',
    'no-return-await': 'error',

    // Node.js specific
    'handle-callback-err': 'error',
    'no-new-require': 'error',
    'no-sync': 'warn',
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-console': 'off',
        'max-lines-per-function': 'off',
      },
    },
  ],
};