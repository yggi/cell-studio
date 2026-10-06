import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

// Rules that catch real problems, not style (Prettier owns style). Errors fail CI; warnings are listed, not blocking.
export default ts.config(
  { ignores: ['dist', 'node_modules', '.svelte-check', 'public', 'docs', 'examples'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node, __APP_VERSION__: 'readonly' } },
    rules: {
      // A leading underscore says "unused on purpose" (a positional argument, a name dropped from a destructuring).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true }],
      // `catch {}` that means "best effort" is fine.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Off: the house style writes several effects in one statement as `if (x) (a(), b());` (Prettier keeps the parentheses).
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'] } },
    rules: {
      // Off: every flagged Map/Set/Date is a scratch value inside one function, or a `$state.raw` Map that is replaced, never mutated;
      // none is meant to be reactive, and a SvelteMap would cost proxies for nothing.
      'svelte/prefer-svelte-reactivity': 'off',
    },
  },
  {
    files: ['**/*.svelte'],
    rules: {
      'svelte/prefer-writable-derived': 'error',
      'svelte/no-unused-props': 'error',
      'svelte/valid-compile': 'error',
      'svelte/require-each-key': 'warn',
      // formatLabel output (CellNode, CellSheet, VoiceNode) is the known case: it escapes its own text.
      'svelte/no-at-html-tags': 'warn',
      // Off: `const uid = `g${++glyphs}`` reads a counter from `<script module>`; the rule does not see that the next instance reads it.
      'no-useless-assignment': 'off',
    },
  },
);
