import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';

export default [
  { ignores: ['playwright-report', 'test-results', 'node_modules'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    // Browser globals appear inside page.evaluate / addInitScript callbacks.
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**', 'fixtures/**', 'pages/**'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Page objects wrap expect() calls, so tests may assert through them.
      'playwright/expect-expect': [
        'error',
        { assertFunctionPatterns: ['^expect[A-Z]', '\\.expect[A-Z]', '\\.generate'] },
      ],
      'playwright/no-conditional-in-test': 'error',
      // Fixtures are requested by destructuring; some (e.g. authedPage) are needed only for their setup.
      'no-unused-vars': ['error', { args: 'none' }],
    },
  },
];
