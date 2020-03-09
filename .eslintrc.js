module.exports = {
  "env": {
    "browser": true,
    "es6": true,
    "node": true
  },
  "extends": [
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "tsconfig.json",
    "sourceType": "module"
  },
  "plugins": [
    "@typescript-eslint"
  ],
  "rules": {
    "@typescript-eslint/adjacent-overload-signatures": "error",
    "@typescript-eslint/array-type": [
      "error",
      {
        default: "array-simple"
      }
    ],
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/ban-ts-comment": "error",
    "@typescript-eslint/ban-types": "error",
    "@typescript-eslint/brace-style": ["error", "1tbs"],
    "@typescript-eslint/class-name-casing": "error",
    "@typescript-eslint/comma-spacing": ["error"],
    "@typescript-eslint/consistent-type-assertions": "error",
    "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    "@typescript-eslint/default-param-last": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-member-accessibility": [
      "error",
      {
        "accessibility": "no-public"
      }
    ],
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/func-call-spacing": "error",
    "@typescript-eslint/indent": [
      "error",
      2
    ],
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/member-delimiter-style": [
      "error",
      {
        "multiline": {
          "delimiter": "semi",
          "requireLast": true
        },
        "singleline": {
          "delimiter": "semi",
          "requireLast": false
        }
      }
    ],
    "@typescript-eslint/member-ordering": "error",
    "@typescript-eslint/naming-convention": "error",
    "@typescript-eslint/no-array-constructor": "error",
    "@typescript-eslint/no-base-to-string": "error",
    "@typescript-eslint/no-dupe-class-members": "error",
    "@typescript-eslint/no-dynamic-delete": "error",
    "@typescript-eslint/no-empty-function": "error",
    "@typescript-eslint/no-empty-interface": "error",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-extra-non-null-assertion": "error",
    "@typescript-eslint/no-extra-parens": "error",
    "@typescript-eslint/no-extra-semi": "error",
    "@typescript-eslint/no-extraneous-class": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-for-in-array": "error",
    "@typescript-eslint/no-implied-eval": "error",
    "@typescript-eslint/no-inferrable-types": "error",
    "@typescript-eslint/no-magic-numbers": "off",
    "@typescript-eslint/no-misused-new": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/no-namespace": "error",
    "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/no-parameter-properties": "off",
    "@typescript-eslint/no-require-imports": "error",
    "@typescript-eslint/no-this-alias": "error",
    "@typescript-eslint/no-throw-literal": "error",
    "@typescript-eslint/no-type-alias": [
      "error",
      {
        "allowAliases": "always",
        "allowMappedTypes": "always"
      }
    ],
    "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
    "@typescript-eslint/no-unnecessary-condition": "off",
    "@typescript-eslint/no-unnecessary-qualifier": "error",
    "@typescript-eslint/no-unnecessary-type-arguments": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/no-unused-expressions": ["error"],
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_" }
    ],
    "@typescript-eslint/no-use-before-define": [
      "error",
      {
        "functions": false
      }
    ],
    "@typescript-eslint/no-useless-constructor": "error",
    "@typescript-eslint/no-var-requires": "error",
    "@typescript-eslint/prefer-as-const": "error",
    "@typescript-eslint/prefer-for-of": "error",
    "@typescript-eslint/prefer-function-type": "error",
    "@typescript-eslint/prefer-includes": "error",
    "@typescript-eslint/prefer-namespace-keyword": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/prefer-readonly": "error",
    "@typescript-eslint/prefer-readonly-parameter-types": "off",
    "@typescript-eslint/prefer-regexp-exec": "error",
    "@typescript-eslint/prefer-string-starts-ends-with": "error",
    "@typescript-eslint/promise-function-async": "off",
    "@typescript-eslint/quotes": [
      "error",
      "single",
      {
        "avoidEscape": true
      }
    ],
    "@typescript-eslint/require-array-sort-compare": "off",
    "@typescript-eslint/require-await": "error",
    "@typescript-eslint/restrict-plus-operands": "error",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/return-await": "error",
    "@typescript-eslint/semi": [
      "error",
      "always"
    ],
    "@typescript-eslint/space-before-function-paren": [
      "error",
      {
        "anonymous": "never",
        "named": "never",
        "asyncArrow": "always"
      }
    ],
    "@typescript-eslint/strict-boolean-expressions": "off",
    "@typescript-eslint/switch-exhaustiveness-check": "error",
    "@typescript-eslint/triple-slash-reference": "error",
    "@typescript-eslint/type-annotation-spacing": "error",
    "@typescript-eslint/typedef": "off",
    "@typescript-eslint/unbound-method": "error",
    "@typescript-eslint/unified-signatures": "error",
    "accessor-pairs": "error",
    "arrow-body-style": "error",
    "array-bracket-newline": [
      "error",
      "consistent"
    ],
    "array-bracket-spacing": [
      "error",
      "always"
    ],
    "array-callback-return": "error",
    "array-element-newline": [
      "error",
      "consistent"
    ],
    "arrow-parens": [
      "error",
      "as-needed"
    ],
    "arrow-spacing": "error",
    "block-scoped-var": "error",
    "block-spacing": "error",
    "brace-style": "off",
    "camelcase": "error",
    "capitalized-comments": "error",
    "class-methods-use-this": "error",
    "comma-dangle": "error",
    "comma-spacing": "off",
    "comma-style": "error",
    "complexity": [
      "error",
      {
        "max": 12
      }
    ],
    "computed-property-spacing": "error",
    "consistent-return": "off",
    "consistent-this": "off",
    "constructor-super": "error",
    "curly": "error",
    "default-case": "error",
    "default-param-last": "error",
    "dot-location": [
      "error",
      "property"
    ],
    "dot-notation": "error",
    "eol-last": "error",
    "eqeqeq": [
      "error",
      "always"
    ],
    "for-direction": "error",
    "function-call-argument-newline": [
      "error",
      "consistent"
    ],
    "func-call-spacing": "off",
    "func-name-matching": "error",
    "func-names": "error",
    "function-paren-newline": [
      "error",
      "consistent"
    ],
    "func-style": [
      "error",
      "declaration",
      {
        "allowArrowFunctions": true
      }
    ],
    "generator-star-spacing": "error",
    "getter-return": "error",
    "grouped-accessor-pairs": "error",
    "guard-for-in": "error",
    "id-blacklist": [
      "error",
      "any",
      "String",
      "string",
      "Boolean",
      "Undefined"
    ],
    "id-match": "off",
    "id-length": [
      "error",
      {
        "exceptions": [ "_", "i" ],
        "max": 40
      }
    ],
    "implicit-arrow-linebreak": "error",
    "import/default": "error",
    "import/dynamic-import-chunkname": "error",
    "import/export": "error",
    "import/exports-last": "off",
    "import/extensions": "error",
    "import/first": "error",
    "import/group-exports": "off",
    "import/max-dependencies": "off",
    "import/named": "error",
    "import/namespace": "error",
    "import/newline-after-import": "error",
    "import/no-absolute-path": "error",
    "import/no-amd": "error",
    "import/no-anonymous-default-export": "error",
    "import/no-commonjs": "error",
    "import/no-cycle": "error",
    "import/no-default-export": "error",
    "import/no-deprecated": "error",
    "import/no-duplicates": "error",
    "import/no-dynamic-require": "error",
    "import/no-extraneous-dependencies": "error",
    "import/no-internal-modules": "off",
    "import/no-mutable-exports": "error",
    "import/no-named-as-default": "error",
    "import/no-named-as-default-member": "error",
    "import/no-named-default": "error",
    "import/no-named-export": "off",
    "import/no-namespace": "error",
    "import/no-nodejs-modules": "off",
    "import/no-relative-parent-imports": "off",
    "import/no-self-import": "error",
    "import/no-unassigned-import": "error",
    "import/no-unresolved": "error",
    "import/no-unused-modules": "error",
    "import/no-useless-path-segments": "error",
    "import/no-webpack-loader-syntax": "error",
    "import/order": [
      "error",
      {
        "alphabetize": {
          "order": "asc"
        },
        "groups": [
          [ "builtin", "external" ],
          [ "parent", "sibling", "index" ]
        ],
        "newlines-between": "always"
      }
    ],
    "import/prefer-default-export": "off",
    "import/unambiguous": "error",
    "indent": "off",
    "init-declarations": "off",
    "jsx-quotes": [
      "error",
      "prefer-single"
    ],
    "key-spacing": "error",
    "keyword-spacing": "error",
    "line-comment-position": "error",
    "linebreak-style": [
      "error",
      "unix"
    ],
    "lines-around-comment": "error",
    "lines-between-class-members": [
      "error",
      "always",
      {
        "exceptAfterSingleLine": true
      }
    ],
    "max-classes-per-file": [
      "error",
      1
    ],
    "max-depth": [
      "error",
      3
    ],
    "max-len": [
      "error",
      {
        "code": 140,
        "ignoreStrings": true
      }
    ],
    "max-lines": [
      "error",
      600
    ],
    "max-lines-per-function": [
      "error",
      100
    ],
    "max-nested-callbacks": [
      "error",
      2
    ],
    "max-params": [
      "error",
      5
    ],
    "max-statements": [
      "error",
      40
    ],
    "max-statements-per-line": "error",
    "multiline-comment-style": "error",
    "multiline-ternary": [
      "error",
      "always-multiline"
    ],
    "new-cap": "error",
    "new-parens": "error",
    "newline-per-chained-call": "error",
    "no-alert": "error",
    "no-array-constructor": "error",
    "no-async-promise-executor": "error",
    "no-await-in-loop": "error",
    "no-bitwise": "error",
    "no-caller": "error",
    "no-case-declarations": "error",
    "no-class-assign": "error",
    "no-compare-neg-zero": "error",
    "no-cond-assign": "error",
    "no-confusing-arrow": "error",
    "no-console": [
      "error",
      {
        "allow": [
          "error"
        ]
      }
    ],
    "no-const-assign": "error",
    "no-constant-condition": "error",
    "no-constructor-return": "error",
    "no-continue": "off",
    "no-control-regex": "error",
    "no-debugger": "error",
    "no-delete-var": "error",
    "no-div-regex": "error",
    "no-dupe-args": "error",
    "no-dupe-class-members": "off",
    "no-dupe-else-if": "error",
    "no-dupe-keys": "error",
    "no-duplicate-case": "error",
    "no-duplicate-imports": "error",
    "no-else-return": "error",
    "no-empty": "error",
    "no-empty-character-class": "error",
    "no-empty-function": "error",
    "no-empty-pattern": "error",
    "no-eq-null": "error",
    "no-eval": "error",
    "no-ex-assign": "error",
    "no-extend-native": "error",
    "no-extra-bind": "error",
    "no-extra-boolean-cast": "error",
    "no-extra-label": "error",
    "no-extra-parens": "off",
    "no-extra-semi": "off",
    "no-fallthrough": "error",
    "no-floating-decimal": "error",
    "no-func-assign": "error",
    "no-global-assign": "error",
    "no-implicit-coercion": "error",
    "no-implicit-globals": "error",
    "no-implied-eval": "error",
    "no-import-assign": "error",
    "no-inline-comments": "error",
    "no-inner-declarations": "error",
    "no-invalid-regexp": "error",
    "no-invalid-this": "error",
    "no-irregular-whitespace": "error",
    "no-iterator": "error",
    "no-label-var": "error",
    "no-labels": "error",
    "no-lone-blocks": "error",
    "no-lonely-if": "error",
    "no-loop-func": "error",
    "no-magic-numbers": "off",
    "no-misleading-character-class": "error",
    "no-mixed-operators": "error",
    "no-mixed-spaces-and-tabs": "error",
    "no-multi-assign": "error",
    "no-multi-spaces": "error",
    "no-multi-str": "error",
    "no-multiple-empty-lines": "error",
    "no-negated-condition": "off",
    "no-nested-ternary": "error",
    "no-new": "error",
    "no-new-func": "error",
    "no-new-object": "error",
    "no-new-symbol": "error",
    "no-new-wrappers": "error",
    "no-obj-calls": "error",
    "no-octal": "error",
    "no-octal-escape": "error",
    "no-param-reassign": "error",
    "no-plusplus": [
      "error",
      {
        "allowForLoopAfterthoughts": true
      }
    ],
    "no-proto": "error",
    "no-prototype-builtins": "error",
    "no-redeclare": "error",
    "no-regex-spaces": "error",
    "no-restricted-globals": "off",
    "no-restricted-imports": "off",
    "no-restricted-properties": "off",
    "no-restricted-syntax": "off",
    "no-return-assign": "error",
    "no-return-await": "error",
    "no-script-url": "error",
    "no-self-assign": "error",
    "no-self-compare": "error",
    "no-sequences": "error",
    "no-setter-return": "error",
    "no-shadow": [
      "error",
      {
        "hoist": "all"
      }
    ],
    "no-shadow-restricted-names": "error",
    "no-sparse-arrays": "error",
    "no-tabs": "error",
    "no-template-curly-in-string": "error",
    "no-ternary": "off",
    "no-this-before-super": "error",
    "no-throw-literal": "error",
    "no-trailing-spaces": "error",
    "no-undef": "error",
    "no-undef-init": "error",
    "no-undefined": "off",
    "no-underscore-dangle": "error",
    "no-unexpected-multiline": "error",
    "no-unmodified-loop-condition": "error",
    "no-unneeded-ternary": "error",
    "no-unreachable": "error",
    "no-unsafe-finally": "error",
    "no-unsafe-negation": "error",
    "no-unused-expressions": "off",
    "no-unused-labels": "error",
    "no-unused-vars": "off",
    "no-use-before-define": [
      "error",
      {
        "functions": false
      }
    ],
    "no-useless-call": "error",
    "no-useless-catch": "error",
    "no-useless-computed-key": "error",
    "no-useless-concat": "error",
    "no-useless-constructor": "off",
    "no-useless-escape": "error",
    "no-useless-rename": "error",
    "no-useless-return": "error",
    "no-var": "error",
    "no-void": "error",
    "no-whitespace-before-property": "error",
    "no-with": "error",
    "no-warning-comments": "off",
    "nonblock-statement-body-position": "off",
    "object-curly-newline": [
      "error",
      {
        "consistent": true
      }
    ],
    "object-curly-spacing": [
      "error",
      "always"
    ],
    "object-property-newline": [
      "error",
      {
        "allowAllPropertiesOnSameLine": true
      }
    ],
    "object-shorthand": "error",
    "one-var": [
      "error",
      "never"
    ],
    "one-var-declaration-per-line": "off",
    "operator-assignment": "error",
    "operator-linebreak": [
      "error",
      "after"
    ],
    "padded-blocks": "off",
    "padding-line-between-statements": "off",
    "prefer-arrow-callback": "error",
    "prefer-const": "error",
    "prefer-destructuring": "off",
    "prefer-exponentiation-operator": "error",
    "prefer-named-capture-group": "error",
    "prefer-numeric-literals": "error",
    "prefer-object-spread": "error",
    "prefer-promise-reject-errors": "error",
    "prefer-regex-literals": "error",
    "prefer-rest-params": "error",
    "prefer-spread": "error",
    "prefer-template": "error",
    "quote-props": [
      "error",
      "as-needed"
    ],
    "quotes": "off",
    "radix": "error",
    "require-atomic-updates": "off",
    "require-await": "off",
    "require-unicode-regexp": "error",
    "require-yield": "error",
    "rest-spread-spacing": "error",
    "semi": "off",
    "semi-spacing": "error",
    "semi-style": "error",
    "sort-imports": [
      "error",
      {
        "ignoreCase": true,
        "ignoreDeclarationSort": true
      }
    ],
    "sort-keys": "off",
    "sort-vars": "off",
    "space-before-blocks": "error",
    "space-before-function-paren": "off",
    "space-in-parens": "error",
    "space-infix-ops": "error",
    "space-unary-ops": "error",
    "spaced-comment": "error",
    "strict": [
      "error",
      "never"
    ],
    "switch-colon-spacing": "error",
    "symbol-description": "error",
    "template-curly-spacing": "error",
    "template-tag-spacing": "error",
    "unicode-bom": "error",
    "use-isnan": "error",
    "valid-typeof": "error",
    "vars-on-top": "error",
    "wrap-iife": "error",
    "wrap-regex": "off",
    "yield-star-spacing": "error",
    "yoda": "error"
  }
};
