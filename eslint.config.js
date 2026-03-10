// @ts-check
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'com.novil.steelseriessonar-by-novil.sdPlugin/bin/**',
            'node_modules/**',
        ],
    },
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        rules: {
            // Catch unused variables; allow underscore-prefixed to be ignored
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

            // Enforce 'import type' for type-only imports
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

            // Prefer nullish coalescing (??) over logical or (||) for defaults
            '@typescript-eslint/prefer-nullish-coalescing': 'warn',

            // Prefer optional chaining (?.) over manual null checks
            '@typescript-eslint/prefer-optional-chain': 'warn',

            // Async functions should always return a value or be awaited
            '@typescript-eslint/no-floating-promises': 'error',

            // Disallow awaiting non-Promise values
            '@typescript-eslint/await-thenable': 'error',

            // allow any objects
            "@typescript-eslint/no-explicit-any": "off",

            // Force curly braces for multi-line blocks, but allow single-line if statements without them
            'curly': ['error', 'multi'],

            // Disallow multiple empty lines (max 1 consecutive empty line)
            'no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],

            // Enforce explicit public/private/protected on class members
            '@typescript-eslint/explicit-member-accessibility': ['error', {
                accessibility: 'explicit',
                overrides: { constructors: 'off' }
            }],

            // Enforce async functions/methods end with "Async" suffix
            '@typescript-eslint/naming-convention': ['error',
                {
                    selector: ['function', 'method'],
                    modifiers: ['async'],
                    format: ['camelCase'],
                    suffix: ['Async'],
                    filter: {
                        match: false,
                        regex: '^(onWillAppear|onDidReceiveSettings|onKeyDown)$'
                    }
                },
            ],
        },
    }
);
