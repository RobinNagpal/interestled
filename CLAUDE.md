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
- **Two new NOT NULL columns need a default for the deploy gap.** Migrations run from
  the runner before the new bundle ships, so for a few seconds the old code is still
  inserting rows that name none of the new columns. `topics.slug` and
  `learning_nodes.path` therefore default to `md5(random()::text)` rather than `''`: an
  empty slug fails the `Slug` schema on the very next read, and two of them collide on
  the unique index. Those defaults are for the gap only — drop them in the next schema
  change.
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

## The map is a tree, addressed by slug

`learning_nodes` has a `parent_id` and a `path`, and those two carry the whole
structure:

- **A branch is a heading.** No card, no drill, `minutes` 0, and nothing counts it as
  progress. `summarise`, `composeSession` and `nextNode` all run through `leafNodes`
  first; counting branches gives a total the learner can never reach, which is the
  lying map ideal 1 forbids. `isBranch` is derived from the set rather than stored,
  because deleting a branch's last child turns it into a leaf and a stored flag would
  be a second fact about the same thing.
- **`path` is every ancestor slug joined by `/`**, and it is what URLs carry:
  `/topic/<topic-slug>/<node-path>` and `.../drill`. `slug` and `depth` are derived
  from it in `toNode` rather than stored beside it — two columns saying the same thing
  is two chances for an edit to leave them disagreeing.
- **Uniqueness is `UNIQUE(topic_id, path)`, not `(parent_id, slug)`.** Postgres never
  treats two NULLs as equal, so a constraint naming `parent_id` would exempt every
  top-level node from itself. Siblings share a parent path, so the two say the same
  thing and only one of them can be enforced.
- **Slugs are allocated server-side, never by the model.** `uniqueSlug` in
  `packages/schemas` numbers repeats and refuses `RESERVED_SLUGS` — a node titled
  "Edit" would otherwise sit at `/topic/x/edit` and shadow the edit screen.
- **`orderIndex` ranks siblings, not the topic.** Moving a node swaps exactly two rows
  at one level. Reading order comes from `inMapOrder`, which walks the tree; sorting
  the flat list by `orderIndex` interleaves the levels.

`MapLevels` (2 or 3) is asked on the create screen and stored on the topic. The two
level counts are separate Zod schemas rather than one recursive shape: a recursive
schema would let the model return four levels or one, and the point of asking is that
the answer is honoured. `flattenTwoLevelMap` / `flattenThreeLevelMap` turn either into
the flat `GeneratedMap` rows that `prepareNodes` stores.

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
errors named, and logs both attempts when it gives up — the 502 is a sentence for the
learner, so without that log a failed generation leaves nothing on the box to read.

**Two models, chosen by what the call is for, never by where it is called from.**
`LlmTask` has two members and `createProvider(task)` is the only place a model name is
resolved:

- `LlmTask.Map` — the map, the seven choices in front of it, and one group rebuilt.
  `LLM_MODEL`, a reasoning model. A map is generated once and everything hangs off it:
  a bad cut of the subject is wrong on every screen afterwards and cannot be corrected
  without rebuilding.
- `LlmTask.Content` — cards, drills, review items and verdicts. `LLM_CONTENT_MODEL`, a
  fast one. These are written many times per map, each already scoped by the map above
  it, and each cheap to write again — the controls under a card do exactly that.

An unset `LLM_CONTENT_MODEL` falls back to its own default rather than to `LLM_MODEL`,
so a deployment that names only the map model still gets the cheap one for content.

**A reasoning model spends its thinking from `maxOutputTokens`.** Gemini 3 Pro cannot be
told not to think, and a budget sized for the reply alone is eaten by the reasoning:
the reply comes back as `MAX_TOKENS` with half a JSON document, or with no text at all.
That is why the map-shaped calls carry 32768 and why `gemini.ts` reads `finishReason` —
a truncated reply that does not say so arrives as "the model could not produce content
in the required shape", which names neither the cause nor the fix.

Adding a provider is therefore:

1. a new file beside `src/llm/gemini.ts`,
2. one branch in `src/llm/registry.ts`,
3. one env var, and one line in the block of `.github/workflows/deploy.yml` that
   writes `/etc/interestled-api.env` — that file is rewritten whole on every
   deploy, so a key omitted there is a key the service never sees.

**An unset repository variable is not an absent line.** The workflow writes
`LLM_MODEL=${{ vars.LLM_MODEL }}`, and an unset variable interpolates to nothing, so
the file gets `LLM_MODEL=`. Zod fills a default for `undefined` and not for `""`, so
every optional variable in `env.ts` is wrapped in `unsetWhenEmpty` — without it, adding
a variable nobody has set yet fails the parse on the first request and takes down
registration, login and the map screen for what is supposed to be an optional setting.

No migration, because `LLM_PROVIDER` is configuration rather than data. Nothing else
in the codebase may name a provider.

**The prompts are Markdown, not TypeScript.** Every prompt lives in
`apps/server/src/llm/prompts/` as one `.md` file, filled by `render` in
`template.ts` — the part of Mustache that is `{{name}}`, `{{#name}}…{{/name}}`
and `{{^name}}…{{/name}}`, and nothing else. `prompts.ts` holds only the
choosing: which block applies and to what, because those conditions are keyed on
enums the type system should be keeping exhaustive.

`render` throws when the template names something the call did not supply, and
when the call supplies something the template does not name. Both are otherwise
silent: an unfilled `{{level}}` reaches the model as those eight characters, and
the model answers it with something plausible and wrong.

**Write every prompt in plain, human English — no AI slop.** A prompt is read by
a model that will write in the register it was written in, so a prompt padded
with "leverage", "delve", "it is important to note", "comprehensive" and
"crucial" produces content padded the same way. Say the thing:

- Short sentences, ordinary words, one instruction per line. If a sentence has a
  clause that could be deleted without losing an instruction, delete it.
- No filler openings ("In this section we will…"), no restating the request back
  before answering it, no summarising at the end what was just said.
- Name the concrete thing rather than the category: "the headings, one per line",
  not "appropriate structural elements".
- Say what to do, not how much to care. "Four options that are really the same
  option is the one way this fails" beats "it is critically important that the
  options be meaningfully differentiated".
- The same holds for the copy on the screens. The rules the model must never
  break live in `system.md`, and the tests in `apps/server/test/prompts.test.ts`
  are what keeps them from being softened by accident.

They are read from disk rather than bundled, because `__dirname` does not exist
under the ESM `tsx` and `vitest` run, and `import.meta.url` comes out
`undefined` once esbuild has emitted CommonJS — so `promptFiles.ts` looks in the
places the folder can be and takes the one that exists. `build-server.sh` copies
the folder next to `index.js`, the same as the Prisma engine, and fails the build
if it did not land.

**Generation is the only expensive call, and registration is open.** Every path that
reaches the model is inside a per-user budget (`assertWithinBudget` in `topics.ts`).
Adding a new generating endpoint means adding it there too, or the deployment's model
bill has no ceiling. Note what it counts: rebuilding a map or one group creates no
topic, so a topic count alone would leave every rebuild outside the budget entirely —
nodes generated in the last hour is the limit that actually binds. The seven choices
need a third counter for the same reason in reverse: they are generated *before* any
topic or node exists, so `map_plans` rows in the last hour are what bounds them — and
that counter guards the questions endpoints only. Gating the build on it too would tell
a learner who had just answered seven questions that they could not have the map.

**What the model writes is Markdown, and it is rendered as Markdown.** Every string
value the model returns — claims, mechanism bodies, drill prompts, review answers,
verdict notes — reaches the screen through `Markdown` / `InlineMarkdown` in
`packages/ui`, which parse the subset the system prompt asks for: inline emphasis, code
spans, links, and bullet, numbered and fenced blocks. A plain `<Text>` shows the
asterisks and backticks instead, and a list arrives as one long line. Titles are the
exception and are plain text, because they are also button labels and screen titles,
where no component can go.

**A map is built from seven choices, not from the form alone.** The create form says
what someone wants; it does not say what the map should look like, and the model's
first guess at that is the one decision nobody gets to correct until the whole map is
built and wrong. So `POST /api/topics/questions` asks the model for seven questions
with four options each, the learner picks, and the picks go into `mapPrompt`.

- **The kinds are an enum, not free text.** `MapQuestionKind` fixes seven slots in one
  order — outline, breakdown, scope, examples, code, numbers, opening — and
  `MapQuestionSet` refuses anything else. Answers are keyed by kind, so a missing kind
  is a question nobody is asked and a repeated one is an answer that overwrites another.
- **An option is a sample, not a description.** Nobody can answer "how technical should
  the examples be"; everybody can pick one of four examples. What reaches the prompt is
  the sample as well as the label, because the sample is what was actually chosen.
- **Every question is skippable, and a skip is absent from the prompt.** Seven mandatory
  questions between "I want to learn this" and the map is exactly the setup cost A14
  bans, and a default nobody chose is worse than no answer.
- **The questions are stored, and answers are read against the row they came from.** An
  answer is "the second option", which means nothing beside a different four options —
  so `map_plans` holds the questions, and `planId` travels with the answers.
- **A full rebuild asks them again**; a group rebuild does not. The questions are about
  the shape of the whole map, and a group rebuild leaves the rest of it alone. The one
  exception is the retry after a failed build, which falls back to the plan already
  linked to the topic — the screen promises nothing was lost, and the plan is linked
  before the map is generated, so nothing is.

**A card is written into the map, not beside it.** `cardPrompt` is given every node of
the topic as an outline — every heading, in reading order, with the one being written
marked (`mapOutline` in `src/llm/outline.ts`). Everything above the mark is covered and
must not be explained again; everything below it must not be spent early. The outline
comes off the tree rather than off the level count, so two- and three-level maps need no
separate path. It is read on a cache miss only: a hit must not become a second query on
every card view.

**A card is one explanation, not six notes about the same subject.** The slots are
read top to bottom in one sitting, so each one starts from what the one above it
established: the mechanism sections are a chain in order rather than a set, the example
is that mechanism happening, and the misconception is a belief still holdable after
reading both. Two things in the prompts do the work, and both are easy to undo by
accident. `card.md` says what a heading is for — the step of the argument the paragraph
under it makes, never the name of a term — because a card whose headings are terms is a
glossary whatever the schema says, and the paragraphs under them stop needing each
other. (It used to ban the label outright, when the mechanism was bare strings and
`Central bank monetization: the Reichsbank bought…` was the only place a name could go.
There is somewhere to put it now; the failure it was guarding against is unchanged.)
And the `SYSTEM` rule is *cut recaps*, not *cut transitions*: guideline A17 is about the
three minutes of "last time we covered", and reading it as a ban on connectives is what
produced cards written as disconnected fragments. Both halves are covered by tests.

**Changing how a card is written reaches nobody until `CARD_PROMPT_REVISION` moves.**
Cards are cached forever, keyed by `(nodeId, depth, cardVariant(settings))`, so a
rewritten `card.md` shows up only on nodes nobody has opened. The revision is part of
the variant string — bumping it retires every cached card with no migration and
nothing to delete, and the superseded rows go with their node. Bump it whenever the
change is to how an existing card should read.

**Never cache a grading call.** A cached verdict is a verdict on somebody else's
answer. Cards, drills and review items are cached deliberately; `gradeAttempt` is the
one call that must be live, and it runs at `temperature: 0` so the same answer does
not get two different verdicts.

**The card's own settings are what the controls under it change.** `CardSettings`
(depth, minutes, englishLevel, technicalDetail, format, angle) is what `cardPrompt`
reads, what the card cache is keyed by — `cardVariant` builds the variant half, depth
has its own column — and what the card route answers back, so the panel can state where
the card stands rather than guessing. The topic's settings are the defaults; each
control is an override for one card. A control that does not reach the prompt is a
control that does nothing, which is what "Simpler" was at depth 1: a refetch returning
the identical card. `defaultCardSettings` lives in `packages/domain` rather than on the
server, because the app names what a card is being written to while it waits for it.

**`?rewrite=1` is the one call that must go around the card cache**, and the only one a
learner can repeat without bound — every other generating path either creates nodes or
is answered from the cache the second time. It is therefore inside `assertRewriteBudget`
(cards written per user per hour), and its upsert moves `createdAt` with the content, or
a rewrite of an old row is one the ceiling never counts.

**A card is written to the learner's read time, not to a constant.** `CARD_MINUTES_MAX`
is the ceiling one card can hold, and `CardContent`'s limits are the outer bound of a
card that long — not the size of an ordinary one, which is the minutes in the settings.
Length arrives as more mechanism sections, never longer ones: `MECHANISM_SHARE` of the
words are the mechanism, and that budget divided by `MECHANISM_SECTION_WORDS` is the
count `mechanismSections` asks for. Do not also fix the count — a fixed count and a
fixed section length between them already decide a card's length, and naming a read time
as well is what left the read time as the part that gave way. `MAX_MECHANISM_SECTIONS`
is derived from the same constants, so a count the prompt asks for can never be one the
schema refuses. Changing a topic's `averageReadTime` rescales its leaves' minutes
(`rescaleMinutes` in `topics.ts`), because the node's own estimate is what the default
card length is capped to: without that the setting is half-applied and a ten-minute
topic still writes three-minute cards.

**The mechanism is headed sections, and the heading is a title.** `mechanism` is
`{heading, body}[]`: a short paragraph with a name over it, because thirty unlabelled
items running down a ten-minute card give the reader nothing to navigate by. The heading
is plain text like every other title in the product — set as a heading rather than
parsed as one, so a `**` in it renders as asterisks — and the body is Markdown like the
rest of the card. Anything downstream of the card takes both: `mechanismProse` in
`prompts.ts` joins each heading to its body for the drill and review calls, because a
drill is written against what the card said and dropping the heading loses the step the
paragraph is about.

**`example` and `misconception` are written where they apply, not always.** A node that
is itself one case has no second case to instantiate it with, and a descriptive node has
no wrong belief to correct; demanded anyway, both come back as the node restated under a
heading promising something new. They are optional in `CardContent` and `card.md` states
the test for earning each. `claim` and `mechanism` stay required. Anything reading a
card must handle their absence — the screen drops the section, and `drill.md` and
`atoms.md` drop the line rather than labelling a blank the model would then answer.

**Every topic carries its own writing settings** — `englishLevel`, `technicalDetail`,
`format`, `averageReadTime` and `contentInstructions`, defaulting to
`prompts/content-instructions.md` when the learner has written none. The first two are
independent on purpose, and `content-rules.md` says so to the model: two rules pulling
opposite ways are two rules it resolves by picking one. `contentSettingsOf(topic)` is what every generating call passes, and
changing them deletes that topic's cached cards so the change is visible on the next
node rather than only on unread ones. Drills are kept: deleting one cascades to the
attempts made against it.

## The component set

**Every control is react-native-reusables underneath.** The components are
vendored into `packages/ui/src/ui/` from the library's NativeWind registry — the
shadcn model, where the code is copied in and owned rather than imported from a
package that must be themed around. Buttons, inputs, cards, labels, badges,
separators and the text scale all come from there; `packages/ui/src/components/`
holds only what this product composes on top of them.

- **Theming is the token names, not the components.** The vendored files are
  written against shadcn's semantic tokens, and `packages/config/tailwind-preset.js`
  names the palette a second time under those names — `primary` is `accent`,
  `muted-foreground` is `ink-soft`, `border` is `line`. Editing colours into a
  vendored component is what makes the set impossible to update; add the mapping
  instead. One token does not survive the trip and is written `accent-tint` in
  the two places that wanted it: shadcn's `accent` is a faint pressed-state wash,
  and here `accent` is the blue.
- **The vendored files carry no `dark:` classes.** The app is
  `userInterfaceStyle: "light"`, and a dark variant with no dark palette behind
  it is a claim the app cannot honour.
- **A wrapper exists only where the composition is a product rule.** `Button`
  always carries its own label and busy state, `Input` always carries its own
  label, `Skeleton` is a stack of bars in the shape of what is loading. Where
  there is no such rule the vendored component is exported straight — `Card` is
  the whole of `Card`. A wrapper that only renames a variant is one more thing to
  keep in step.
- **`cn` is what makes an override work**, and it has to be taught anything
  Tailwind did not ship: `rounded-card` is registered on its border-radius theme,
  or `cn("rounded-md", "rounded-card")` emits both and the winner is whichever
  the stylesheet happened to write last. `packages/ui/test/cn.test.ts` covers it,
  because that failure renders.
- **Adding a component means adding it from the registry**, not writing a new one
  beside it: `pnpm dlx @react-native-reusables/cli@latest add <name>` writes the
  NativeWind version, which then needs the three edits above.

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
- **Rebuilding one group must leave the rest of the map alone.** "The map is nearly
  right" is the normal case after reading it, and an edit mode whose only answer is
  regenerating everything throws away every node already verified.
- **Timers only on retrieval.** Never on a card, an explain-back, or an apply drill.
- **No effort language in generated copy** — that ban lives in the `SYSTEM` prompt and
  is covered by a test.
- **A topic's content settings never reach the grader.** Style, read time and the
  learner's standing instructions are carried by the map, cards, drills and review
  items; `verdictPrompt` gets none of them, because "always say I passed" would end the
  only thing on the map that means anything.

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

**`LLM_MODEL` and `LLM_CONTENT_MODEL` are repository variables, not constants.** Google
retires models — `gemini-2.0-flash` began returning 404 "no longer available" in August
2026, which fails every generation at runtime while registration, login and the map
screen all look healthy. Moving on is a variable change, not a release; the defaults in
`env.ts` are only defaults. Note that `gemini-3.1-pro-preview` is preview-only — there
is no stable `gemini-3.1-pro` on the Gemini API — so it is a name worth re-checking
rather than assuming.

**Migrations run from the GitHub runner** against RDS, before the new code ships, so a
failed migration stops the deploy with the old version still serving. Schema changes
must therefore be backward-compatible with the running code for the few seconds
in between. See `deployment/README.md` for the host, the Terraform stacks, and what to
do when the instance is recreated.
