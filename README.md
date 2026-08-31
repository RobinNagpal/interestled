# Interest Led

A learning app built on one idea: now that an LLM can generate any explanation on
demand, content is no longer the expensive part. What is still hard is showing the
right thing in the right order and making sure it stays — so the interface is the
product.

You add a topic, the backend generates a **map** of it, and you work through the map
one small node at a time. Every node ends in something you produce, and what you write
comes back as a diff against a reference answer rather than as a score.

- [docs/ux/README.md](docs/ux/README.md) — the design: the loop, 18 building blocks,
  five worked topics, and a coverage table.
- [docs/ux/adhd-learning-guidelines.md](docs/ux/adhd-learning-guidelines.md) — the
  constraints the product must satisfy, with the research behind each.
- [CLAUDE.md](CLAUDE.md) — conventions, and the rules that must not be broken.

## What is built

| | |
|---|---|
| **Accounts** | Email + password, scrypt hashed, bearer-token sessions |
| **Topics** | A 60-second calibration, then one model call produces an 8–24 node map |
| **Map** | Per-node status, advisory prerequisites, "I already know this", progress as capability |
| **Concept card** | Six fixed slots, five depth buttons, cached per (node, depth, variant) |
| **Drills** | Predict-then-reveal, explain-back, apply — with escalating hints |
| **Grading** | A got / vague / missing / wrong diff against reference points, never a score |
| **Review** | Items extracted on first pass, spaced by failure, three at a time |
| **Restore point** | Saved every keystroke; re-entry shows your half-written answer |

## Stack

pnpm workspaces + Turborepo, mirroring [courtpot](https://github.com/RobinNagpal/courtpot).

```
apps/mobile     Expo + expo-router + NativeWind (iOS, Android, web from one codebase)
apps/server     Hono + Prisma + Postgres, one systemd service on a shared host
packages/schemas  Zod schemas and enums — the single source of truth for types
packages/domain   Pure rules: progress, scheduling, session composition, depth
packages/api      Typed REST client + React Query hooks
packages/ui       Shared React Native components
packages/config   tsconfig, eslint and tailwind presets
```

## Running it locally

```sh
pnpm install
cp apps/server/.env.example apps/server/.env    # DATABASE_URL + GEMINI_API_KEY
pnpm --filter server exec prisma migrate deploy
pnpm --filter server dev                        # http://localhost:7071
cp apps/mobile/.env.example apps/mobile/.env    # EXPO_PUBLIC_API_URL
pnpm --filter mobile dev                        # press w for web
```

You need a Postgres connection string (Neon and Supabase free tiers work) and a
Gemini API key from [aistudio.google.com](https://aistudio.google.com/apikey).

```sh
pnpm typecheck && pnpm test && pnpm lint
```

## Using a different LLM

Only Gemini is implemented, but nothing above `LlmProvider` knows that. Point the
server at another model by setting `LLM_PROVIDER` and `LLM_MODEL`; to add one:

1. write a file beside `apps/server/src/llm/gemini.ts` implementing `LlmProvider` —
   one method, in and out as text;
2. add a branch to `apps/server/src/llm/registry.ts`;
3. add the key to the env file the deploy workflow writes, in
   `.github/workflows/deploy.yml`.

No migration is needed: the provider is configuration, not data. See
[CLAUDE.md](CLAUDE.md#llm-providers).

## Deployment

Everything runs on AWS behind one domain — CloudFront serves the web export from S3
and `/api/*` from a Lightsail instance shared with courtpot, so there is no CORS and
one origin. See
[deployment/README.md](deployment/README.md) for the one-time Terraform apply and the
GitHub Actions secrets. Pushing to `main` typechecks, tests and lints, then deploys.
