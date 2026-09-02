# Drills, progress and review

Reading a card never completes a node. A node moves only when the learner
produces something and it is graded, and what "known" means depends on the kind
of subject.

## The status ladder

`NodeStatus` in `packages/schemas/src/nodes.ts`:

```
untouched → seen → explained → verified
                 ↘ shaky ↙            due (in spaced review)
```

- `seen` — the card was opened. This is as far as reading ever gets.
- `explained` — a passed explain-back.
- `verified` — a pass on the drill that defines mastery **for this archetype**.
- `shaky` — a failure, or a missed review item. An earned node never drops below
  it.

`advance()` in `packages/domain/src/progress.ts` is the whole rule, and it takes
two options rather than assuming:

- `isMastery` — from `masteryDrill(archetype)`. Assuming "an apply drill" left
  System, Story and Self-help topics unable to reach `verified` at all.
- `penalise` — false for `Predict`. A guess made before the reveal is a learning
  device, not an assessment; scoring it stops people guessing honestly.

## Which drill means "known"

`masteryDrill` in `packages/domain/src/session.ts`:

| Archetype | Mastery drill |
|---|---|
| System | `Predict` |
| Tool, Skill | `Apply` |
| Story, Self-help | `ExplainBack` |

`DrillKind` has three members: `explain_back` ("say it in your own words"),
`predict` (commit to a guess before the reveal, never scored), and `apply` (use
it on a case the card did not cover).

`GET /api/nodes/:id/drill?kind=` generates one per `(node, kind)` and reuses it.
It is written against the card the learner actually read — the `Written` lookup —
because a drill written against a freshly generated card would be the
regeneration the card route just declined, through a side door.

## Grading

`POST /api/nodes/attempts` is **the one call that is never cached**: a cached
verdict is a verdict on somebody else's answer. It runs at `temperature: 0` so
the same answer never gets two different verdicts.

`Verdict` is a diff, not a score:

```
items: { label: got | vague | missing | wrong, point, note }[]
passed: boolean          deliberately not a number
misconception: string    in the learner's own words, so the next card can target it
```

`orderVerdict` shows what they got first, then what was missing.

The attempt row and the node's new status are written in one transaction. The
topic's content settings never reach `verdictPrompt` — "always say I passed"
would end the only thing on the map that means anything.

## Spaced review

The first time a node is passed, review items are extracted from the card it was
read from (`createAtoms` in `learning.ts`). Failure there is deliberately
swallowed: the answer is already graded and the node has already moved, so a
model failure must not turn a successful attempt into an error. The next pass
retries it.

`atoms` rows carry `AtomKind` (`cloze`, `reverse`, `application`, `production`),
an interval, an ease, a lapse count and a due date. The first is due in 24 hours.

`GET /api/review` answers **three items**, never a backlog. `dueNow` in
`packages/domain/src/scheduling.ts` round-robins across nodes so consecutive
items come from different places, and everything else overdue simply stays due —
two hundred items is a wall, which is how a two-week absence becomes never coming
back. `dueCount` is reported beside the batch so the screen can say how
many are waiting without offering them — it counts the overdue rows actually
loaded, which the query caps at 60.

`POST /api/review` grades one item as `recalled` or `missed`:

```
missed    interval → 0, ease − 0.2 (floor 1.3), lapses + 1, due tomorrow
recalled  interval → 1 or round(interval × ease), capped at 180 days
          ease + 0.05 (ceiling 3)
```

A miss also reopens its source node (`afterLapse` → `shaky`), so forgetting shows
up as visible work on the map rather than as invisible decay.

Deliberately simpler than SM-2: the scheduler's job is to keep items coming back,
and the failure path matters far more than the exact spacing of the successes.

## Progress

`summarise` counts **leaves only**. Progress is stated as capability — what the
learner can now do — with the counts supporting it, never as a bare percentage of
an unseen total.

```
total, earned, shaky        leaf counts
capabilities                the capability line of every earned node
remainingMinutes            the sum over leaves not yet earned
```

## Study sessions

`POST /api/sessions` plans one inside a minute budget and states the contract
before anything starts: *"12 minutes, 4 nodes, and you'll be able to …"*
(`contractLine`).

`composeSession` walks the unearned leaves in map order and lays out screens,
never allowing three of the same shape in a row (`MAX_SAME_SHAPE` is 2) — a run
of identical screens is treated as a fault. A due review batch goes first.

`POST /api/sessions/:id/end` answers the closing artefact: what they can now do,
what they got wrong, and what is next.

`PUT /api/sessions/resume` saves a restore point per `(user, topic)` — the node,
the drill, the half-typed answer — debounced on the client
(`RESUME_DEBOUNCE_MS`, 800ms) and flushed on unmount, so leaving mid-sentence
costs nothing.

## What must not break

- **Reading can never complete a node.** Only production advances past `seen`.
- **No streaks, no scores, no percentages of an unseen total.**
- **A failed prediction never moves a node.**
- **The review batch is three items**, never a backlog.
- **Timers only on retrieval** — never on a card, an explain-back or an apply
  drill.

## Where to look

```
packages/domain/src/progress.ts      advance, isEarned, summarise, orderVerdict
packages/domain/src/scheduling.ts    reschedule, dueNow, REVIEW_BATCH
packages/domain/src/session.ts       masteryDrill, nextNode, composeSession
apps/server/src/learning.ts          the drill route, attempts, atom extraction
apps/server/src/review.ts            the batch and the grading
apps/server/src/sessions.ts          planning, ending, the restore point
apps/server/src/llm/prompts/{drill,verdict,atoms}.md
apps/mobile/components/NodeDrill.tsx
apps/mobile/app/review.tsx
```
