import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', 'backend/supabase/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['backend/**', 'shared/**', '*.{js,ts,mts}', 'frontend/*/*.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['frontend/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: reactHooks.configs.recommended.rules,
  },
  prettier,
);
