# Cards and writing settings

A card is one concept on one screen, in the same slots every time. It is written
by the model the first time somebody opens the node, cached, and then adjustable
by the controls underneath it.

## The slots

`CardContent` in `packages/schemas/src/cards.ts`:

| Slot | Required | What it is |
|---|---|---|
| `claim` | yes | The answer, in one sentence, before any context |
| `mechanism` | yes | `{heading, body}[]` — the explanation as a chain of short headed paragraphs |
| `example` | no | That mechanism happening, concretely |
| `misconception` | no | A belief still holdable after reading both, and the correction |
| `jargon` | yes (may be empty) | Terms and glosses, defined in place |

`example` and `misconception` are optional because a node that is itself one case
has no second case, and a descriptive node has no wrong belief. Demanded anyway,
both come back as the node restated under a heading promising something new.
**Anything reading a card must handle their absence.**

The mechanism is a chain, not a set: each section starts from what the one above
it established. Length arrives as *more sections*, never longer ones —
`MECHANISM_SHARE` (0.8) of the word budget divided by `MECHANISM_SECTION_WORDS`
(80) is the count the prompt asks for, and `MAX_MECHANISM_SECTIONS` is derived
from the same constants so the prompt can never ask for a count the schema
refuses.

Every string the model writes is rendered through `Markdown` / `InlineMarkdown`
in `packages/ui`. Titles and section headings are the exception — plain text,
because they are also button labels.

## The settings

`CardSettings` is what decides how one card comes out:

```
depth            1–5, sticky per learner (users.default_depth)
minutes          how long it should take to read, capped at CARD_MINUTES_MAX (10)
englishLevel     simple | medium | advanced
technicalDetail  low | medium | high        independent of englishLevel
format           prose | reference_notes
paragraphLength  short | medium | long
angle            base | more_concrete | why_it_matters | where_this_breaks
instructions     free text, the node's own
```

The topic's settings are the defaults (`defaultCardSettings` in
`packages/domain/src/cards.ts` — shared, because the app names what a card is
being written to while it waits for it). Each control is an override for one
card, sent in the query rather than stored.

`instructions` is the one that is not a chip: it lives on
`learning_nodes.card_instructions`, is saved by
`PUT /api/nodes/:id/card-instructions`, and holds for the next writing too.

The topic's own screen — **How it is written**, saved by
`PUT /api/topics/:slug/content-settings` — sets those defaults, `averageReadTime`,
the standing `contentInstructions`, and `narrationVoice`. The voice is the odd one
out: it reaches no prompt and is not in the card cache key, because it changes who
reads a card aloud and no word of what is written
([doc 4](04-reading-a-card-aloud.md)).

Whether a save changed anything is decided by walking
`TopicContentSettingsInput.keyof()` rather than a list written out. The list had
gone stale: a save that moved only `paragraphLength` answered 200 and stored
nothing.

## The cache

`concept_cards` is unique on `(node_id, depth, variant)`. `cardVariant(settings)`
builds the variant half — `CARD_PROMPT_REVISION`, angle, minutes, register — and
`parseCardVariant` reads it back, which is what lets a stored row say what it was
written to. It returns null for an earlier revision, so **bumping
`CARD_PROMPT_REVISION` retires every cached card** with no migration and nothing
to delete.

The instructions are deliberately *not* in the key: free text cannot be a key
without being hashed, and a hash cannot say what it was. The row stores the text
instead (`concept_cards.instructions`).

## Three ways to ask for a card

`GET /api/nodes/:id/card` resolves one of three lookups (`CardLookup` in
`apps/server/src/learning.ts`):

| Lookup | When | Behaviour |
|---|---|---|
| `Written` | A plain open, and what the drill and review items read | The card at these settings if cached, else **the newest card the node has**, else write one |
| `Exact` | Any chip moved (the query names a setting) | The card at exactly those settings; write it if it is not cached |
| `Rewrite` | `?rewrite=1` | Go around the cache and write it again |

`Written` is the whole of what makes regeneration manual. Changing a topic's
settings, or the learner's depth, changes which key a plain open looks under;
answering that miss with the card that already exists — and saying what it was
written to — turns "every node you open is written again" into a note and a
button.

The route answers `settings` (what the card on screen was written to) beside
`defaults` (what a plain open writes to now). Where they differ, the panel says
the settings have moved and offers the one button.

`?rewrite=1` is one of only two calls a learner can repeat without bound, so it
is inside `assertRewriteBudget`, and its upsert moves `createdAt` with the
content — otherwise a rewrite of an old row is one the ceiling never counts.

## Writing the card

`cardPrompt` is given **every node of the topic** as an outline with the one being
written marked (`mapOutline` in `apps/server/src/llm/outline.ts`). Everything
above the mark is covered and must not be explained again; everything below must
not be spent early. The map is read on a cache miss only.

It runs on `LlmTask.Content`, the fast model, because a card is written many
times per map and is cheap to write again.

Opening a node marks it `Seen` and nothing more.

## Questions asked on a card

`POST /api/nodes/:id/questions` answers in one paragraph the length of the card's
own, against the card the learner is reading (the `Written` lookup, never a fresh
one), the map with the node marked, and the last `EARLIER_QUESTIONS` (5) asked on
that card. Rows live in `card_questions` and are listed on the card with each
answer folded behind its question.

It is a model call per press, so it is inside `assertQuestionBudget`. The answer
is never cached: the same words twice is the learner asking again.

## What a settings change does

Nothing. Changing a topic's writing settings writes no cards and deletes none.
Every card already written keeps its writing and says underneath that the
settings have moved; nodes nobody has opened are written to the new settings.

The one exception is `averageReadTime`: changing it rescales the leaves' own
`minutes` (`rescaleMinutes` in `topics.ts`), because a node's estimate is what
the default card length is capped to — without that, a ten-minute topic would
still write three-minute cards.

`narrationVoice` deletes nothing either, but it does retire the topic's
recordings, by missing their keys — see [doc 4](04-reading-a-card-aloud.md).

## Where to look

```
apps/server/src/learning.ts              the card, instructions and question routes
apps/server/src/llm/prompts/card.md      how a card is written
apps/server/src/llm/prompts/question.md  how a question on one is answered
apps/server/src/llm/prompts.ts           cardPrompt, questionPrompt, the guides
packages/schemas/src/cards.ts            CardContent, CardSettings, the variant
packages/domain/src/cards.ts             defaultCardSettings, sameCardSettings
apps/mobile/components/NodeCard.tsx      the screen and the controls under it
```

See CLAUDE.md, *A card is one explanation*, *Regeneration is manual*, and
*Changing how a card is written reaches nobody until CARD_PROMPT_REVISION moves*.
