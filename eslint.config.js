import globals from 'globals';
import tseslint from 'typescript-eslint';

import pluginJs from '@eslint/js';

export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  {
    ignores: [
      "src/parser/mxsParser.*",
      "src/parser/mxsLexer.*",
      "src/parser/mxsParserListener.*",
      "src/parser/mxsParserVisitor.*",
    ]
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-undef": "warn"
    }
  }
];