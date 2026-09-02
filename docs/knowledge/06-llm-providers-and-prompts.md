# LLM providers and prompts

Everything the model writes goes through two interfaces, one model-name resolver,
one structured-generation helper, and a folder of Markdown prompts.

## Two interfaces, three tasks

`apps/server/src/llm/types.ts` and `apps/server/src/llm/speech.ts`:

```ts
interface LlmProvider   { complete(request): Promise<string> }   // text
interface SpeechProvider { speak(request): Promise<Speech> }     // audio
```

Deliberately one method each. Everything above `LlmProvider` asks for JSON
matching a Zod schema through `generateJson`, so a provider has exactly one job
and adding one cannot spread across the codebase.

`LlmTask` says what a call is *for*, and that is what picks the model —
never where it is called from:

| Task | Env var | Why |
|---|---|---|
| `Map` | `LLM_MODEL` (a reasoning model) | The map, the seven questions, one group rebuilt. Generated once, and everything hangs off it: a bad cut of the subject is wrong on every screen afterwards. |
| `Content` | `LLM_CONTENT_MODEL` (a fast one) | Cards, drills, review items, verdicts, answers, narration scripts. Written many times per map, each already scoped by the map above it, each cheap to write again. |
| `Speech` | `LLM_AUDIO_MODEL` (a TTS model) | A card read out. |

`modelFor(env, task)` in `env.ts` is the **only** place a model name is resolved,
and it is a `switch`, so adding a task fails the build here rather than quietly
running on the content model.

`TextTask` is the union of `Map | Content` and is what `createProvider` takes, so
`createProvider(LlmTask.Speech)` does not compile — `createSpeechProvider()` is
the way to the third. An unset `LLM_CONTENT_MODEL` falls back to its own default
rather than to `LLM_MODEL`; the audio model has no fallback worth having, which
is why it is its own variable.

## Adding a provider

1. A new file beside `apps/server/src/llm/gemini.ts`.
2. One branch in `apps/server/src/llm/registry.ts`.
3. One env var, and one line in the block of `.github/workflows/deploy.yml` that
   writes `/etc/interestled-api.env` — that file is rewritten whole on every
   deploy, so a key omitted there is a key the service never sees.

No migration: `LLM_PROVIDER` is configuration rather than data. **Nothing else in
the codebase may name a provider.**

Providers are built lazily and cached per task in `createApp`, so a missing API
key fails the request that needed the model rather than stopping the server.
Tests inject their own through `AppOptions`.

## Environment

Every optional variable is wrapped in `unsetWhenEmpty`. The deploy workflow
writes `LLM_MODEL=${{ vars.LLM_MODEL }}`, and an unset variable interpolates to
nothing — so the file gets `LLM_MODEL=`, not no line. Zod fills a default for
`undefined` and not for `""`, so without the wrapper adding a variable nobody has
set yet fails the parse on the first request and takes down registration, login
and the map screen.

`getEnv()` parses on first use, not at import, so the environment is not a
load-order dependency.

Model names are **repository variables, not constants**. Google retires models;
moving on is a variable change, not a release. The defaults in `env.ts` are only
defaults.

## Structured generation

`generateJson` in `apps/server/src/llm/json.ts`:

- Asks for `responseMimeType: "application/json"`, and still validates with the
  schema.
- `stripFence` unwraps a fenced block before parsing — cheaper than a retry.
- On a schema failure it **retries once** with the validation errors named. A
  loop would turn one slow call into an unbounded one.
- When the second attempt fails it logs why each was rejected and the head of
  what came back, then throws `GenerationError`. The learner gets a sentence they
  can act on; without the log that sentence is the only thing anybody has.

A **reasoning model spends its thinking from `maxOutputTokens`**. Gemini 3 Pro
cannot be told not to think, and a budget sized for the reply alone is eaten by
the reasoning: the reply comes back as `MAX_TOKENS` with half a JSON document, or
no text at all. That is why the map-shaped calls carry `MAP_OUTPUT_TOKENS`
(32768), the narration call carries 8192, and `gemini.ts` reads `finishReason` —
a truncated reply that does not say so arrives as "the model could not produce
content in the required shape", which names neither the cause nor the fix.

## The prompts are Markdown

One `.md` file per prompt in `apps/server/src/llm/prompts/`, filled by `render`
in `template.ts`. `prompts.ts` holds only the *choosing* — which block applies and
to what — because those conditions are keyed on enums the type system should keep
exhaustive.

`render` implements the part of Mustache that is `{{name}}`, `{{#name}}…{{/name}}`
and `{{^name}}…{{/name}}`, and nothing else. Its useful behaviour is its
strictness: it **throws when the template names something the call did not
supply, and when the call supplies something the template does not name**. Both
are otherwise silent — an unfilled `{{level}}` reaches the model as those eight
characters, and the model answers it with something plausible and wrong.

Prompts are read from disk rather than bundled, because `__dirname` does not
exist under the ESM `tsx`/`vitest` run and `import.meta.url` comes out
`undefined` once esbuild has emitted CommonJS. `promptFiles.ts` looks in the
places the folder can be and takes the one that exists;
`deployment/scripts/build-server.sh` copies the folder next to `index.js` and
fails the build if it did not land.

### The files

| Prompt | Used by |
|---|---|
| `system.md` | Every call. The hard rules. |
| `map.md`, `map-two-levels.md`, `leaf-rules.md`, `group-rules.md`, `ordering.md`, `archetypes.md` | Building a map |
| `map-questions.md`, `map-choices.md` | The seven questions, and the answers going back in |
| `map-instructions.md`, `content-instructions.md` | The instruction lines the settings seed |
| `subtree.md`, `subtree-leaves.md` | Rebuilding one group |
| `card.md`, `content-rules.md`, `learner.md`, `instructions.md` | Writing a card |
| `question.md` | A question asked on a card |
| `narration.md` | A card read aloud |
| `drill.md`, `verdict.md`, `atoms.md` | Drills, grading, review items |

## Writing a prompt

**Plain, human English — no AI slop.** A prompt is read by a model that writes in
the register it was written in, so a prompt padded with "leverage", "delve", "it
is important to note" and "crucial" produces content padded the same way.

- Short sentences, ordinary words, one instruction per line. If a clause could be
  deleted without losing an instruction, delete it.
- No filler openings, no restating the request before answering it, no summary at
  the end of what was just said.
- Name the concrete thing rather than the category: "the headings, one per line",
  not "appropriate structural elements".
- Say what to do, not how much to care.

The rules the model must never break live in `system.md`, and
`apps/server/test/prompts.test.ts` is what keeps them from being softened by
accident. Two of them are easy to undo and are covered by name:

- The ban is on **recaps**, not on transitions. Reading it as "cut every
  connective" is what produced cards written as disconnected fragments.
- `narration.md` is the one prompt allowed to turn off the "write Markdown" rule,
  because it is spoken.

## What must not break

- **Nothing outside `registry.ts` names a provider.**
- **Never cache a grading call.** `gradeAttempt` runs live at `temperature: 0`.
- **A topic's content settings never reach `verdictPrompt`.**
- **No effort language in generated copy** — banned in `SYSTEM`, covered by a
  test.

See CLAUDE.md, *LLM providers* and *The prompts are Markdown, not TypeScript*.
