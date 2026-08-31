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
- `tsconfig` strict mode stays on. `pnpm typecheck` must pass clean across every
  package, and `pnpm test` and `pnpm lint` gate the deploy — see Deployment below.

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
- Verify a hand-written migration by applying it to a throwaway database and running
  `prisma migrate diff --from-url <that db> --to-schema-datamodel prisma/schema.prisma
  --script`. It must report an empty migration. Getting this wrong is expensive here:
  migrations are applied automatically on every push to `main`.

### No database enums

**Enums live in TypeScript only; the database column is a plain string.**
`NodeStatus` is a TS enum in `packages/schemas`, and `learning_nodes.status` is `TEXT`.
Adding a status is a one-line code change with no migration. `NodeStatusSchema`
is what guarantees the string is valid — parse at every boundary that reads the column.

Do not add `enum` blocks to `schema.prisma`.

## Accounts and sessions

**There are no roles.** Every user sees only their own rows, there is no admin, and
nothing is shared between accounts — so authorisation is ownership, checked by scoping
each query to `c.get("userId")`. A query that forgets the scope is a data leak, not a
missing feature. This is the whole of the model; do not add a role column without a
reason that survives that sentence.

Identity is email + password, in `src/auth.ts` and `src/password.ts`:

- **scrypt from `node:crypto`**, not argon2 from npm — memory-hard, and no native build
  step to ship. The cost parameters are stored *in* the hash
  (`scrypt$N$r$p$salt$hash`), so they can be raised later and older hashes still verify
  against their own parameters. Raising `N` needs no migration.
- **`passwordHash` is omitted globally** by the Prisma client's `omit` config, so it
  cannot reach a response by accident. Login is the one deliberate opt-out
  (`omit: { passwordHash: false }`); if you write a second one, be sure it is.
- **Login verifies against a dummy hash when the address is unknown**, so a wrong
  address and a wrong password take the same time. Returning early on a missing user
  would leak which addresses have accounts. Registration answers `409` on a taken
  address on purpose — that is a usability call, not an oversight.
- **Sessions are opaque bearer tokens** (24 random bytes) in `auth_sessions`, expiring
  after 30 days and checked on every request. An expired row is deleted when it is
  hit, and a login sweeps that user's lapsed rows, so nothing has to cron the table.

**Registration is open**, which is what makes the generation budget below the only
thing standing between an anonymous visitor and an unbounded model bill.

## LLM providers

The server talks to exactly one interface, `LlmProvider` in `src/llm/types.ts`, with a
single method that returns text. Everything above it asks for JSON matching a Zod
schema through `generateJson`, which validates and retries once with the validation
errors named.

Adding a provider is therefore:

1. a new file beside `src/llm/gemini.ts`,
2. one branch in `src/llm/registry.ts`,
3. one env var, and one line in the block of `.github/workflows/deploy.yml` that
   writes `/etc/interestled-api.env` — that file is rewritten whole on every
   deploy, so a key omitted there is a key the service never sees.

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

## Deployment

Push to `main` and it ships: `.github/workflows/deploy.yml` runs typecheck, test and
lint, then exports the web app to S3, invalidates CloudFront, applies migrations, and
restarts the API. There is no staging environment — `main` is production.

**The API is a process, not a Lambda.** It runs as the `interestled-api` systemd unit
on port **7072** of a Lightsail instance **shared with courtpot**, which runs on 7071.
Caddy on that box terminates TLS for `api.interestled.com` and proxies to 7072;
CloudFront serves `/api/*` from there and everything else from S3, so production is
same-origin and CORS exists only for local development.

That the host is shared is the thing to remember when changing anything runtime-shaped:

- **A leak or a hang here takes courtpot down too.** They share CPU and memory. This is
  the deliberate trade for one bill instead of two, but it means an unbounded cache or
  a runaway generation loop is a two-application outage.
- **The process is long-lived.** No cold start to design around, but also no fresh
  container to tidy up after a leak, and no Lambda function timeout killing a runaway
  call at 120s. The practical ceiling on a slow generation is now CloudFront's 60s
  origin read timeout — Caddy adds none, and Node's own 5-minute request timeout is
  far above it.
- The bundle stays **CommonJS** and ships the `debian-openssl-3.0.x` Prisma engine
  beside it, because the generated client requires its engine at runtime from its own
  directory. A top-level `await` in `src/index.ts` would force ESM and break that.

**`/etc/interestled-api.env` is rewritten whole on every deploy** from repository
secrets and variables. Nothing set by hand on the box survives, which is the point —
the workflow is the source of truth. The corollary is in *LLM providers* above: a key
that is not in the workflow is a key the service never sees.

**`LLM_MODEL` is a repository variable, not a constant.** Google retires models —
`gemini-2.0-flash` began returning 404 "no longer available" in August 2026, which
fails every generation at runtime while registration, login and the map screen all
look healthy. Moving on is a variable change, not a release; the default in `env.ts`
is only a default.

**Migrations run from the GitHub runner** against RDS, before the new code ships, so a
failed migration stops the deploy with the old version still serving. Schema changes
must therefore be backward-compatible with the running code for the few seconds
in between. See `deployment/README.md` for the host, the Terraform stacks, and what to
do when the instance is recreated.
