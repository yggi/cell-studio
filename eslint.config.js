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
    languageOptions: { globals: { ...globals.browser, ...globals.node, __BUILD__: 'readonly' } },
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
  {
    // Import from cells' entry points (`@yggi/cells`, `/edit`, `/inspect`, `/midi`, `/time`, `/library`, `/repository`), not a module path (#677,
    // yggi/cells#830). The files below still reach a module on purpose: the view until it moves here (#650, decision 086), names no
    // entry point has (`ORDER`, `SEED`, the fixtures, `fiveto12`, the folder's scoring) and `Take`, a class the entry point exports as a type only.
    // The list only shrinks.
    files: ['**/*.{ts,svelte,mjs}'],
    ignores: [
      'src/examplesIndex.slow.test.ts',
      'src/extraction.test.ts',
      'src/layout/cellview.test.ts',
      'src/layout/cellview.ts',
      'src/layout/compile.drawn.test.ts',
      'src/layout/fragmentmap.ts',
      'src/layout/live.ts',
      'src/layout/realize.drawn.test.ts',
      'src/layout/routing.drawn.test.ts',
      'src/layout/routing.ts',
      'src/layout/show.ts',
      'src/ui/GraphLegend.svelte',
      'src/ui/PluginNode.svelte',
      'src/ui/PulseEdge.svelte',
      'src/ui/colour.test.ts',
      'src/ui/complete.test.ts',
      'src/ui/plugin.test.ts',
      'src/ui/pluginTrust.svelte.ts',
      'src/ui/pluginView.ts',
      'src/ui/state/record.svelte.ts',
      'tools/examples-doc.ts',
      'tools/examples-index.ts',
      'tools/gallery/fragments/data.ts',
      'tools/gallery/pieces.ts',
      'tools/probe/midi.test.ts',
      'tools/probe/ratchet.test.ts',
      'tools/probe/scalogram.test.ts',
      'tools/smoke-pick.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@yggi/cells/engine/*', '@yggi/cells/theory/*', '@yggi/cells/repository/*'],
              message: "Import from cells' entry points (@yggi/cells, /edit, /inspect, /midi, /time, /library, /repository): #677.",
            },
          ],
        },
      ],
    },
  },
);
