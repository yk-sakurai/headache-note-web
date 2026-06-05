module.exports = [
  {
    ignores: [
      "lib/**",
      "node_modules/**",
    ],
  },
  {
    files: ["**/*.{ts,js}"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      parser: require("@typescript-eslint/parser"),
    },
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
      import: require("eslint-plugin-import"),
    },
    rules: {},
  },
];
