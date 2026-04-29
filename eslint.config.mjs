// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  rules: {
    "import/extensions": [
      "error",
      "always",
      {
        ignorePackages: true,
        js: "always",
        jsx: "always",
        ts: "always",
        tsx: "always",
        vue: "always",
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["#shared", "#shared/*"],
            message: "Use ~~shared alias instead of #shared.",
          },
        ],
      },
    ],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "never",
      },
    ],
  },
  ignores: ["app/**/*.vue"],
});
