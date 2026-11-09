// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// AyyurDB modules that Convex also runs (docs/ayyurdb.md section 3). They stay plain TypeScript.
const plainDbModules = ['schema', 'clock', 'merge', 'ids', 'checksum', 'convex'].map((name) => `src/db/${name}/**`);

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/db/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // `@/db/m0` is the temporary device check (spec section 15). Remove it here when M0 closes.
              group: ['@/db/*', '!@/db/react', '!@/db/m0'],
              message: 'App code imports AyyurDB only through @/db and @/db/react (docs/ayyurdb.md section 3).',
            },
            {
              group: ['drizzle-orm', 'drizzle-orm/*', 'expo-sqlite', 'react-native-libsodium'],
              message: 'Only src/db/ uses the database and crypto libraries (docs/ayyurdb.md section 3).',
            },
          ],
        },
      ],
    },
  },
  {
    files: plainDbModules,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'react-native', 'react-native-*', '@react-native/*', 'expo', 'expo-*', '@expo/*'],
              message: 'Convex runs this module too, so it must stay plain TypeScript (docs/ayyurdb.md section 3).',
            },
            {
              group: ['@/*'],
              message: "Import other AyyurDB modules by relative path. Convex can't resolve @/ (docs/ayyurdb.md section 3).",
            },
            {
              group: ['../store', '../store/*', '../sync', '../sync/*', '../crypto', '../crypto/*', '../react', '../react/*', '../tables', '../tables/*'],
              message: "These modules use React Native, so Convex can't run them (docs/ayyurdb.md section 3).",
            },
          ],
        },
      ],
    },
  },
]);
