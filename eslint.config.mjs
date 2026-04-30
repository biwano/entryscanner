// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  rules: {
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
    "no-console": [
      "error",
      {
        allow: ["warn", "info", "error"],
      },
    ],
  },
  ignores: ["app/**/*.vue"],
});
