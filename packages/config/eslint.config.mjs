import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Shared flat config. `any`/`unknown` are errors — see CLAUDE.md. */
export default tseslint.config(
  { ignores: ["dist/**", ".expo/**", "node_modules/**", "**/*.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        // ignoreRestSiblings allows the destructure-to-omit idiom:
        // `const { secret: _omit, ...rest } = row`.
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
);
