module.exports = {
    // プログラムの実行環境をESLintに教える
    env: {
        browser: true,
        es2020: true,
    },

    // 共有設定を適用する。共有設定はESLintに標準で含まれているものか別途インストールしたもの、またはインストール済みのプラグインのパッケージに含まれているものを指定する
    // 共有設定: 複数のルールの適用をまとめて設定するもの
    extends: [
        'plugin:react/recommended',
        'airbnb/hooks',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:prettier/recommended',
        'prettier',
    ],

    // ESLintが使用するパーサを指定する
    parser: '@typescript-eslint/parser',

    // パーサの各種実行オプションを設定する
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 2020,
        project: './tsconfig.eslint.json',
        sourceType: 'module',
        tsconfigRootDir: __dirname,
    },

    // 任意のプラグインを読み込む
    // プラグイン: ESLintの組み込みルール以外に独自のルールを追加するもの
    // プラグインは読み込んだだけではなんの効力も持たず、extendsかrulesで設定する必要がある
    plugins: [
        '@typescript-eslint',
        'import',
        'unused-imports',
        'jsx-a11y',
        'prefer-arrow',
        'prettier',
        'react',
        'react-hooks',
    ],

    root: true,

    // 適用する個別のルールと、エラーレベルや例外などその設定値を記述する
    // 基本的にはextendsで適用した共有設定が読み込まれているので、そのうちのいくつかを個別で無効にしたいときに設定する
    rules: {
        'lines-between-class-members': [
            'error',
            'always',
            {
                exceptAfterSingleLine: true,
            },
        ],
        'no-void': 'off',
        'padding-line-between-statements': [
            'error',
            {
                blankLine: 'always',
                prev: '*',
                next: 'return',
            },
        ],
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                'vars': 'all',
                'args': 'after-used',
                'argsIgnorePattern': '_',
                'ignoreRestSiblings': false,
                'varsIgnorePattern': '_',
            },
        ],
        'import/extensions': [
            'error',
            'ignorePackages',
            {
                js: 'never',
                jsx: 'never',
                ts: 'never',
                tsx: 'never',
            },
        ],
        'prefer-arrow/prefer-arrow-functions': [
            'error',
            {
                disallowPrototype: true,
                singleReturnOnly: false,
                classPropertiesAllowed: false,
            },
        ],
        'react/jsx-filename-extension': [
            'error',
            {
                extensions: ['.jsx', '.tsx'],
            },
        ],
        'react/jsx-props-no-spreading': [
            'error',
            {
                html: 'enforce',
                custom: 'enforce',
                explicitSpread: 'ignore',
            },
        ],
        'unused-imports/no-unused-imports-ts': 'warn',
        'sort-imports': 0,
        'import/order': [
            2,
            {
                'alphabetize': {
                    'order': 'asc'
                }
            }
        ],
        'react/display-name': 0,
        'react/react-in-jsx-scope': 0,
        '@typescript-eslint/no-unsafe-assignment': 0,
        '@typescript-eslint/no-unsafe-member-access': 0,
        '@typescript-eslint/no-unsafe-return': 0,
        '@typescript-eslint/no-unsafe-call': 0,
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/unbound-method': 0,
        '@typescript-eslint/restrict-template-expressions': 0,
        'react/jsx-props-no-spreading': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/no-unused-vars': 0,
        '@typescript-eslint/restrict-plus-operands': 0,
        '@typescript-eslint/no-empty-function': 0,
        '@typescript-eslint/no-floating-promises': 0,
    },
    overrides: [
        {
            'files': ['*.tsx'],
            'rules': {
                'react/prop-types': 'off',
            },
        },
    ],
    settings: {
        'import/resolver': {
            node: {
                paths: ['.'],
            },
        }
    },
};
