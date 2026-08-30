# Interest Led — Working Agreements

The product is the interface: an LLM can generate any explanation on demand, so
what is scarce is showing the right thing in the right order and making it stay.
The design that this code implements is in [docs/ux/README.md](docs/ux/README.md),
and the constraints it must satisfy are in
[docs/ux/adhd-learning-guidelines.md](docs/ux/adhd-learning-guidelines.md).

## Git identity

Always commit as the **robinnagpal.tiet@gmail.com** GitHub account
([github.com/RobinNagpal](https://github.com/RobinNagpal)) — never the work account.

```sh
git config user.name "Robin Nagpal"
git config user.email "robinnagpal.tiet@gmail.com"
```

Check `git config user.email` before the first commit in a session.

## Types

Use strict types everywhere. Nearly all code is TypeScript, with **no `any` and no
`unknown`** leaking into application code.

- Model the real shape instead of escaping the type system — no `any`, no `unknown`,
  and no `as` casts standing in for either. Parse with the schema instead: an
  unrecognised value must fail loudly rather than flow through.
- **Use an `enum` wherever a value comes from a fixed set** — statuses, kinds,
  archetypes, providers. Never pass bare strings. Pair the enum with `z.nativeEnum(…)`
  so the same set validates at every boundary.
- Types come from `packages/schemas` (Zod schemas + inferred types) — the single
  source of truth. Infer from a schema rather than hand-writing a parallel interface.
- `pnpm typecheck` must pass clean across every package.

## Database naming

**Table names are plural `snake_case`; column names are `snake_case`.** Postgres folds
unquoted identifiers to lower case, so a `ConceptCard` table would have to be written
`"ConceptCard"` in every hand-written query; snake_case never needs quoting.

Prisma keeps its own conventions — models stay singular `PascalCase`, fields stay
`camelCase` — and `@@map` / `@map` are the only place the two meet:

```prisma
model ConceptCard {
  nodeId String @map("node_id")

  @@map("concept_cards")
}
```

- Add a plural `@@map` to every new model, and `@map` to every field whose name is
  not already a single lower-case word.
- **Renames need hand-written migrations.** `prisma migrate dev` cannot tell a rename
  from a drop-and-recreate, so it generates `DROP TABLE` + `CREATE TABLE` and destroys
  the rows. Write `ALTER TABLE … RENAME` by hand, and rename the constraints and
  indexes too (`…_pkey`, `…_key`, `…_fkey`) so Prisma's expected names still match.

### No database enums

**Enums live in TypeScript only; the database column is a plain string.**
`NodeStatus` is a TS enum in `packages/schemas`, and `learning_nodes.status` is `TEXT`.
Adding a status is a one-line code change with no migration. `NodeStatusSchema`
is what guarantees the string is valid — parse at every boundary that reads the column.

Do not add `enum` blocks to `schema.prisma`.

## LLM providers

The server talks to exactly one interface, `LlmProvider` in `src/llm/types.ts`, with a
single method that returns text. Everything above it asks for JSON matching a Zod
schema through `generateJson`, which validates and retries once with the validation
errors named.

Adding a provider is therefore:

1. a new file beside `src/llm/gemini.ts`,
2. one branch in `src/llm/registry.ts`,
3. one env var, and one line in the Lambda's `environment` block in terraform.

No migration, because `LLM_PROVIDER` is configuration rather than data. Nothing else
in the codebase may name a provider.

**Generation is the only expensive call, and registration is open.** Every path that
reaches the model is inside a per-user budget (`assertWithinBudget` in `topics.ts`).
Adding a new generating endpoint means adding it there too, or the deployment's model
bill has no ceiling.

**Never cache a grading call.** A cached verdict is a verdict on somebody else's
answer. Cards, drills and review items are cached deliberately; `gradeAttempt` is the
one call that must be live, and it runs at `temperature: 0` so the same answer does
not get two different verdicts.

## What the product rules are, and where they live

These are load-bearing. Breaking one is a bug, not a trade-off:

- **Reading can never complete a node.** Only production advances past `Seen`
  (`packages/domain/src/progress.ts`). If this goes, the map starts lying and
  everything resting on it collapses.
- **Nothing on the map locks.** Prerequisites are advisory notes; a learner may open
  any node at any time.
- **No streaks, no scores, no percentages of an unseen total.** Progress is stated as
  capability. A failed drill never drops an earned node below `Shaky`, and a failed
  *prediction* never moves it at all — a guess made before the reveal is a learning
  device, not an assessment, and scoring it stops people guessing honestly.
- **The archetype decides what `Verified` means.** `advance` takes the mastery drill
  from `masteryDrill(archetype)` rather than assuming an apply drill; assuming it left
  three of the five archetypes unable to reach `Verified` at all.
- **The review batch is three items**, never a backlog, so an absence cannot become a
  wall.
- **Timers only on retrieval.** Never on a card, an explain-back, or an apply drill.
- **No effort language in generated copy** — that ban lives in the `SYSTEM` prompt and
  is covered by a test.

The coverage table in `docs/ux/README.md` maps each of the 40 guidelines to the part of
the product that answers it. If you add a feature, add its row.
