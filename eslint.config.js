import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['dist']),
    {
        files: ['**/*.{js,jsx}'],
        extends: [js.configs.recommended, reactHooks.configs.flat.recommended, prettierConfig],
            languageOptions: {
              ecmaVersion: 2020,
              globals: {
                ...globals.browser,
                process: 'readonly',
                api: 'readonly'
              },
              parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
              },
            },        plugins: {
            prettier: prettierPlugin,
        },
        rules: {
            'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
            'prettier/prettier': 'error',
        },
    },
]);
