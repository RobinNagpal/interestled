# Reading a card aloud

A play button under the claim on every card. The first press writes a spoken
script and synthesises it; after that the recording is in an S3 bucket and a
press is a download.

## What plays is not the card read out

A card is written to be looked at: it has formulas in it, snippets, exact
figures. A machine reading those aloud spells out every symbol and says every
backtick, which is worse than silence.

So `apps/server/src/llm/prompts/narration.md` asks for what a person would say
reading the card *with the learner in front of them, pointing at it*:

> the formula under 'How the rate compounds' — the balance times one plus r, all
> to the power n
>
> the second line of the snippet is where the lock is taken

It never reads a symbol or a line of code out, points at sections by what is
written on them (never "above" or "below"), says numbers the way they are read
aloud, and carries no Markdown, stage directions or speaker labels. It is also
**the one prompt that turns off a `SYSTEM` rule** — "every string you write is
rendered as Markdown" read aloud is a machine saying "asterisk". Both halves are
covered by tests in `apps/server/test/prompts.test.ts`.

Length: `narrationWords(minutes)` at `SPOKEN_WORDS_PER_MINUTE` (150), so a card
takes about as long to listen to as to read.

## The two routes

```
GET  /api/nodes/:id/audio?<the seven card settings>   is there one, and where
POST /api/nodes/:id/audio?<the seven card settings>   make one, and keep it
```

The settings are **required and are what the card route answered**. They are the
only thing that says which of a node's cards the button is on: moving a chip
writes a second card and moving it back serves the first again, so "the newest
card this node has" is the one the reader navigated away from.

`GET` costs two queries and — only when there is a row to point at — one
signature. It never reaches a model, never writes, and **must not build the
object store until it has something to sign**: it runs on every card mount and
every return to the foreground, so building it eagerly would make a deployment
with no `AUDIO_BUCKET` answer 502 on every card open.

`POST` is idempotent. A row already current is answered from the bucket, and the
budget is checked *after* that decision, so a press that would cost nothing is
never the one refused.

## How a recording is made

1. `generateNarration` — the content model turns the card into a script.
2. `speech.speak` — the speech model says it. Gemini answers with **raw PCM and
   no container**: 16-bit mono at the rate named in the part's mime type.
3. `pcmToWav` puts a 44-byte RIFF header in front of it. Nothing plays headerless
   samples, and a header written against the wrong rate plays at the wrong speed
   rather than failing — which is why `sampleRateOf` reads the rate rather than
   assuming it.
4. The object goes to the bucket, then the row is written. That order can leave
   an object nothing points at; the other order leaves a row pointing at nothing,
   which the player meets as a broken link.

WAV rather than MP3 because there is no encoder on the shared host and shipping
one would be a third application on it. The cost is size — about 48 KB a second —
which is why a recording is made once and played from the bucket after that.

## Where a recording lives

`narrationKey` in `packages/schemas/src/audio.ts`:

```
<user-slug>/<topic-slug>/<node-path>/n<rev>-d<depth>-<variant>.wav
robin/kubernetes/scheduling/taints/n1-d2-r6-base-3-medium-medium-prose-medium.wav
```

Readable rather than hashed, built from the same slugs the URLs are. The file
name is the card's identity, so a card re-recorded at the same settings
**overwrites its own object** and one at different settings gets its own.

`users.slug` is allocated at registration from the address and never changed —
changing it orphans everything already recorded. See doc 5.

`NARRATION_PROMPT_REVISION` travels in the key, and the row stores the key it was
written to, so bumping it makes every stored row miss its own lookup. No
migration, nothing to delete.

## Staying honest about what it is a recording of

`card_narrations` is keyed on the **card** (`card_id` unique), not the node.

A rewrite replaces a card's text in place without changing its id, so the row
stores `card_written_at` — the card's own `createdAt` at the moment it recorded.
A row whose value no longer matches is never served: the button goes back to
offering a recording, and a player part-way through the old one stops offering to
resume it.

It is marked stale rather than deleted **on purpose**. Those rows in the last hour
are the ceiling, and a counter another endpoint could empty is a counter a
learner could empty — rewrite-then-play in a loop would otherwise cost nothing
against the tightest budget in the product.

## The player

`apps/mobile/components/CardAudio.tsx`, on `expo-audio`.

One player for the life of the card, fed by `replace()` — `useAudioPlayer(source)`
builds a *new* player whenever the source changes and releases the old one, so
passing state into it and calling `replace` as well tears the player down
mid-press.

`isLoadedRecordingCurrent` in `packages/domain/src/audio.ts` decides resume
against reload, and lives in the domain package with tests because getting it
wrong reads the wrong card out at somebody. What is loaded stops being current
when:

- the server's recording has a different `madeAt` (the card was written again), or
- the signed link has passed its hour — a recording is streamed, so an expired
  URL stops it partway through rather than failing on the press.

`status.isBuffering` is deliberately **not** part of the disabled state: an 11 MB
WAV rebuffers through most of a playback on mobile data, and a disabled button
there is a pause control that ignores taps.

## Costs and limits

The most expensive press in the product — a model call plus minutes of
synthesised speech billed by the audio second. `assertNarrationBudget` is the
tightest ceiling there is.

The known limit is **CloudFront's 60s origin read timeout**: a ten-minute card is
a script plus minutes of synthesis in one request. The server finishes and writes
the row even when the edge gives up, so a failed press marks the query stale and
the app goes and looks rather than paying again. Solving it properly means
`202`-plus-poll.

**Nothing deletes an object.** A re-recording overwrites its own key, but a
deleted node, a rebuilt map and a bumped revision all leave objects behind. There
is no lifecycle rule, because expiring a recording silently costs a model call to
get it back. The fix is a sweep by prefix, and it needs `s3:DeleteObject` the API
user deliberately lacks.

## Configuration

Everything is optional in `env.ts`. A deployment with no `AUDIO_BUCKET` serves
every route and fails only the press, naming the variable that is missing.

```
LLM_AUDIO_MODEL   default gemini-3.1-flash-tts-preview
AUDIO_BUCKET      the private bucket; no public access, signed GETs only
AWS_REGION
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
```

Those last two are the **API's own** IAM user (`interestled-api`), which can put
and get objects in the audio bucket and nothing else in the account. They reach
the env file through the `API_AWS_*` repository secrets — not the deployer's key.
See `deployment/terraform/audio.tf`.

## Where to look

```
apps/server/src/narration.ts                 the orchestration and the staleness rule
apps/server/src/audio/wav.ts                 PCM → WAV
apps/server/src/storage.ts                   the ObjectStore seam and the S3 one
apps/server/src/llm/speech.ts                the SpeechProvider interface
apps/server/src/llm/gemini.ts                createGeminiSpeech
apps/server/src/llm/prompts/narration.md
packages/schemas/src/audio.ts                the key, the revision, NodeAudio
packages/domain/src/audio.ts                 isLoadedRecordingCurrent
apps/mobile/components/CardAudio.tsx
```
