import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        process: "readonly",
        Buffer: "readonly",
        console: "readonly",
        fetch: "readonly",
      },
    },
    files: ["packages/*/src/**/*.ts", "packages/*/__tests__/**/*.ts", "packages/*/src/__tests__/**/*.ts"],
  },
);
