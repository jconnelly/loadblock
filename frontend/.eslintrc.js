module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'react-app',
    'react-app/jest',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-hooks',
  ],
  rules: {
    // Error prevention
    'no-unused-vars': 'error',
    'no-console': 'warn',
    'no-debugger': 'error',

    // React specific
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react/react-in-jsx-scope': 'off', // React 17+

    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Code style
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',

    // Best practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],

    // Complexity
    'complexity': ['error', 10],
    'max-depth': ['error', 4],
    'max-len': ['error', { code: 100, ignoreUrls: true }],
    'max-lines-per-function': ['error', 50],

    // JSX specific
    'react/jsx-pascal-case': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/jsx-curly-spacing': ['error', 'never'],
    'react/jsx-equals-spacing': ['error', 'never'],
    'react/jsx-indent': ['error', 2],
    'react/jsx-indent-props': ['error', 2],
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.test.jsx', '**/*.spec.js', '**/*.spec.jsx'],
      rules: {
        'no-console': 'off',
        'max-lines-per-function': 'off',
      },
    },
  ],
};