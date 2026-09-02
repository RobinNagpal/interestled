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
      /*
       * A screen is a `Screen` from the component set, never a bare
       * `ScrollView` — that is what keeps the mobile keyboard off the field
       * being typed into, and it is a rule nobody can be asked to remember
       * every time a field is added to a screen that had none. The three
       * places that need the real one say why in a disable comment.
       */
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["ScrollView"],
              message:
                "Use Screen from @interestled/ui, which keeps the keyboard off what is focused.",
            },
          ],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        // ignoreRestSiblings allows the destructure-to-omit idiom:
        // `const { secret: _omit, ...rest } = row`.
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
);
