# UX Patterns for Learning Any Topic Deeply and Quickly

A design document for an LLM-backed learning product. The premise: a backend can
call an LLM to generate any content we ask for, on demand, per learner. The
question this document answers is **not** "what content should we generate?" but
**"what should the screen look and behave like so that generated content actually
turns into understanding, fast?"**

Content is cheap now. Attention, sequencing, and retrieval are not. The UX is the
product.

---

## Table of contents

1. [The two failure modes we are designing against](#1-the-two-failure-modes-we-are-designing-against)
2. [Design principles](#2-design-principles)
3. [The core interaction shell: Map → Focus → Drill → Recall](#3-the-core-interaction-shell-map--focus--drill--recall)
4. [Catalog of UX primitives](#4-catalog-of-ux-primitives)
5. [Topic archetypes: different subjects need different default UX](#5-topic-archetypes-different-subjects-need-different-default-ux)
6. [Worked examples](#6-worked-examples)
   - [6.1 Robotics](#61-robotics--a-system-topic)
   - [6.2 Finance: inflation history, impacts, implications](#62-finance-inflation-history-impacts-and-implications--a-narrative--causal-topic)
   - [6.3 Kubernetes](#63-kubernetes--a-tool--procedural-topic)
   - [6.4 French](#64-french--a-skill--fluency-topic)
   - [6.5 Motivation](#65-motivation--a-self-application-topic)
7. [Backend and LLM generation architecture](#7-backend-and-llm-generation-architecture)
8. [The memory model: making it stick](#8-the-memory-model-making-it-stick)
9. [Anti-patterns](#9-anti-patterns-things-that-look-good-in-a-demo-and-fail-in-week-two)
10. [Build order](#10-build-order)

---

## 1. The two failure modes we are designing against

Almost every learning tool sits at one of two broken extremes.

**Failure mode A — the chatbot.** Infinite, fluent, on-demand. Feels amazing for
ten minutes. Fails because:

- There is no **map**. The learner cannot see what they don't know, so they can't
  ask about it. You only get answers to questions you already knew to ask.
- There is no **state**. Turn 40 does not know what you understood at turn 3.
- There is no **floor**. Nothing forces you to produce anything, so nothing is
  encoded. Reading a great explanation feels identical to knowing it.
- **Scroll is amnesia.** The transcript grows, the understanding doesn't.

**Failure mode B — the course.** A fixed tree of modules, videos, and quizzes.
Fails because:

- It is **one-size-fits-all**. A backend engineer learning Kubernetes and a
  product manager learning Kubernetes get the same module 1.
- It is **slow by construction**. You must walk the tree to reach the one thing
  you actually needed.
- Its **granularity is wrong**. A 22-minute video is not addressable. You cannot
  ask it a follow-up, and you cannot re-review only the 40 seconds that mattered.

The design target is the middle: **the structure of a course, the responsiveness
of a conversation, and the retention mechanics of a flashcard system** — with the
LLM generating structure, explanation, and assessment on demand.

---

## 2. Design principles

These constrain every screen in this document.

### P1. Always show the map, always show position on it
The single largest accelerator of learning speed is knowing where you are and
what remains. A persistent, visible **knowledge map** with per-node status
(untouched / seen / explained back / verified / due for review) does more for
speed than any improvement in explanation quality. It converts a vague
"I should learn X" into a finite, shrinking list.

### P2. Every screen has exactly one job
Not one screen with a map, a chat, a quiz, and a diagram. One primitive at a
time, with fast transitions between them. Cognitive load spent on the interface
is stolen from the subject.

### P3. The learner must produce, not just consume
Every unit of learning ends with an act of production: an explanation typed back,
a prediction made before the reveal, a parameter chosen, a sentence spoken, a
command written. Recognition is not knowledge. **The default interaction should
be generative, not navigational.**

### P4. Predict before reveal
Never show the answer first. Ask the learner to commit — guess the number, guess
the failure, guess the word, guess the outcome — then show the truth. The gap
between prediction and reality is what encodes. This one pattern can be layered
onto almost every primitive in section 4, and it is nearly free to implement.

### P5. Depth is a dimension, not a destination
Every explanation is a node with an **explicit depth axis**. The learner should be
able to press "simpler", "deeper", "show me the math", "show me the code", "why
does this matter" on any sentence, without losing their place. Depth-on-demand is
what lets the same product serve "explain inflation to me in five minutes" and
"walk me through the monetary transmission mechanism."

### P6. Adaptivity is driven by evidence, not by settings
Do not ask the learner to self-report their level with a dropdown; people are bad
at it. Infer level from what they produce — the vocabulary in their explain-backs,
the errors they make, what they skip. A calibration interaction (section 4.1) is a
diagnostic, not a form.

### P7. State is explicit and inspectable
The learner should be able to open a panel and see "here is what the system
believes you know, and why." A visible model is a trustworthy model, and it lets
the learner correct it ("no, I already know Docker") — which is also the cheapest
personalization signal you will ever get.

### P8. Speed of iteration beats richness of any single artifact
A fast, plain, immediately-generated diagram beats a beautiful one that takes
eight seconds. Stream everything. Skeleton-render everything. Pre-generate the
likely next node while the learner reads the current one.

---

## 3. The core interaction shell: Map → Focus → Drill → Recall

Every topic, regardless of subject, runs through the same four-surface loop. This
is the product's spine; the primitives in section 4 plug into it.

```
   ┌──────────────────────────────────────────────────────────────┐
   │                          MAP                                 │
   │   the whole topic as a graph, with your status on each node  │
   │   "what exists, what I know, what's next"                    │
   └───────────────────────────┬──────────────────────────────────┘
                               │  pick a node (or accept the suggested one)
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                         FOCUS                                │
   │   one concept, one screen. Explanation at your depth,        │
   │   one visual, one worked example. Depth controls in reach.   │
   └───────────────────────────┬──────────────────────────────────┘
                               │  you have "seen" it — now prove it
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                         DRILL                                │
   │   produce something: explain back, predict, manipulate,       │
   │   debug, translate, decide. Immediate targeted feedback.      │
   └───────────────────────────┬──────────────────────────────────┘
                               │  result updates the map + schedules review
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                         RECALL                                │
   │   spaced, mixed, cross-node retrieval. Short. Daily.          │
   │   Failures reopen the FOCUS surface for that node.            │
   └──────────────────────────────────────────────────────────────┘
```

Three rules make the loop work:

- **The loop is short.** Map → Focus → Drill for a single node should take 3–8
  minutes, not 40. Small nodes mean frequent wins and fine-grained state.
- **Drill is not optional.** A node cannot reach "verified" status by being read.
  The map must be honest, or principle P1 collapses.
- **Recall is scheduled, not browsed.** The learner does not choose what to
  review; the system does, from the failure history.

### The layout

A three-pane shell holds this without modal navigation:

```
┌────────────┬────────────────────────────────────────┬──────────────┐
│            │                                        │              │
│    MAP     │              FOCUS / DRILL             │   ASK / MY   │
│  (rail)    │            (main stage)                │    NOTES     │
│            │                                        │              │
│ ▸ nodes    │  ┌──────────────────────────────────┐  │  free-form   │
│   with     │  │   one visual / one explanation   │  │  question    │
│   status   │  └──────────────────────────────────┘  │  box, scoped │
│   dots     │                                        │  to the      │
│            │  [simpler] [deeper] [example] [why]    │  current     │
│ progress   │                                        │  node        │
│ ring       │  ─────────────────────────────────     │              │
│            │  Drill: <produce something>            │  saved       │
│ [review 6] │                                        │  atoms       │
└────────────┴────────────────────────────────────────┴──────────────┘
```

The right rail is the escape hatch that makes the whole thing feel like a
conversation rather than a course: **any question, any time, without leaving the
node** — and the answer can be promoted into a new map node with one click, so
curiosity extends the map rather than derailing it.

---

## 4. Catalog of UX primitives

These are the reusable building blocks. Each entry gives: what it is, why it
works, what the LLM generates for it, and where it fits in the loop.

### 4.1 The Calibration Probe (entry point)

**What:** Instead of "what's your level? [Beginner/Intermediate/Advanced]", the
first screen is 5–7 rapid interactions that measure rather than ask:

- 2 "do you know this term?" swipes over jargon at different depths
- 1 "which of these is closest to what you want to do with this?" (goal, not level)
- 1 free-text: "tell me what you already know about X" (30 seconds, optional)
- 1 "how much time do you have — 20 minutes, a week, or ongoing?"
- 1 adjacent-knowledge probe: "which of these do you already use?" (for Kubernetes:
  Docker, Linux, CI/CD, cloud — this is the single highest-value question, because
  it tells you which analogies will land)

**Why:** It sets depth, vocabulary, analogy source, and map size — the four things
that determine whether the next hour is useful. It takes under 60 seconds and it
feels like the product is paying attention rather than filling out a form.

**LLM generates:** the probe items themselves (topic-specific), and from the
answers, the initial learner profile + map scope.

**Loop position:** before MAP, once per topic.

---

### 4.2 The Knowledge Map

**What:** A DAG of 15–40 concept nodes for the topic, rendered as a rail or a
zoomable graph. Each node carries a status:

| Status | Meaning | How reached |
|---|---|---|
| ○ Untouched | not seen | default |
| ◔ Seen | explanation read | opened FOCUS |
| ◑ Explained | learner restated it acceptably | passed an explain-back drill |
| ● Verified | applied it correctly in a novel case | passed an application drill |
| ⟳ Due | verified but decaying | spaced-repetition scheduler |
| ⚠ Shaky | failed a recall | failed drill or recall |

**Why:** This is principle P1 made concrete. It gives finiteness ("this is 24
nodes, not infinity"), it gives honest progress (a progress bar you cannot game by
scrolling), and it makes the *shape* of the subject visible — which is itself a
large part of expertise.

**Interactions that matter:**
- Click a node → FOCUS on it.
- "I already know this" → mark verified, collapse its prerequisites, shrink the map.
  (Huge for speed, and a strong learner signal.)
- "Just get me to X" → the map highlights the **critical path** to node X and dims
  the rest. This is the single best answer to "learn it quickly."
- Nodes are **addable**: a question from the right rail can become a node.

**LLM generates:** the node list, dependency edges, per-node one-line summary,
estimated minutes, and a difficulty rank. Regenerated/extended as the learner's
goals sharpen.

**Loop position:** MAP; persistent on screen everywhere.

---

### 4.3 The Concept Card (the FOCUS unit)

**What:** One screen, one concept. Fixed internal structure so the learner's eye
learns where to look:

```
   NODE TITLE
   ── one-sentence answer to "what is this, really?"      ← the plain claim
   ── the visual (diagram / timeline / chart / snippet)   ← one, not three
   ── 3–5 sentences of mechanism: why it behaves this way ← the actual content
   ── one worked concrete example, fully specific         ← numbers, names, code
   ── "the thing people get wrong here"                   ← the misconception
   [simpler] [deeper] [more concrete] [why it matters] [where this breaks]
```

**Why:** Consistency of structure is an underrated speed multiplier — the learner
stops parsing layout and starts parsing content. The fixed slots also force the
LLM to produce the parts that are usually missing: the *mechanism* (not just the
definition) and the *misconception* (which is where most real learning happens).

**Depth controls (P5)** are the core interaction. Each is a regeneration of the
same node at a different setting:
- **simpler** → drop jargon, add an analogy from the learner's known domains
- **deeper** → add the layer underneath (the math, the protocol, the mechanism)
- **more concrete** → replace abstraction with a specific instance
- **why it matters** → consequence, stakes, what decisions it changes
- **where this breaks** → edge cases, exceptions, when the model is wrong

Depth is **sticky per learner**: if they press "deeper" three times, subsequent
cards start deeper.

**LLM generates:** all of it, from (node, learner profile, current depth,
known-analogy domains).

**Loop position:** FOCUS.

---

### 4.4 Explain-Back (the default drill)

**What:** "In your own words, explain <node> to <audience>." The learner types or
speaks 2–4 sentences. The LLM does not grade with a score; it returns a
**diff against a reference model**:

```
✓ You got: the causal direction, the role of X
△ Vague:   you said "it makes things faster" — faster than what, and why?
✗ Missing: the constraint that makes this necessary at all
✗ Wrong:   you said A causes B; it's B that causes A here.
   → here is the 2-sentence correction, and one example that shows the direction
```

**Why:** This is the highest-yield primitive in the whole document. It is
generative (P3), it exposes the illusion of understanding created by fluent
reading, and its output is the best possible input to the learner model (P6) —
the misconceptions are *stated in the learner's own words*, which is exactly what
future explanations should target.

**Variants:** explain to a 12-year-old / to your boss / to a skeptic who thinks
it's a bad idea. The audience switch is a cheap, powerful depth control.

**Loop position:** DRILL. Advances a node from Seen → Explained.

---

### 4.5 Predict-Then-Reveal

**What:** Before showing any result — a chart, a command's output, a system's
behavior, the next line of a dialogue — ask the learner to commit to a prediction.
Then reveal, and *explain the delta*.

Forms:
- **Slider prediction:** "Draw where you think US inflation went 1979–1983."
- **Multiple-outcome:** "You run `kubectl delete pod` on a pod owned by a
  Deployment. What happens?"
- **Free prediction:** "This robot's IMU drifts 2°/min. After 10 minutes of
  dead reckoning, how far off is its position estimate?"

**Why:** P4. Prediction error is the strongest encoding signal available, it's
cheap to generate, and it turns passive charts into events. It also surfaces the
learner's actual mental model far more efficiently than any question about it.

**Loop position:** DRILL, and layered inside FOCUS before any reveal.

---

### 4.6 The Interactive Model / Parameter Playground

**What:** A small, live, manipulable model of the concept with 1–3 parameters and
an immediate visual response. Not a simulation of everything — a knob and a
consequence.

- Robotics: a PID gain slider against a step-response plot; a 2-link arm whose
  joint angles you drag to feel forward vs inverse kinematics.
- Finance: a "money supply / supply shock / rate response" trio of sliders driving
  an inflation-and-unemployment plot.
- Kubernetes: replica count and a node-failure toggle against a pod-placement grid.

**Why:** Some concepts are relationships between quantities, and no amount of prose
transfers a relationship as fast as ten seconds of moving a slider and watching
the curve. It builds intuition — the thing that survives when the details fade.

**Implementation note:** the LLM does not need to *be* the simulator. Have it emit
a small parameterized spec (or a sandboxed snippet) against a fixed set of
pre-built widget types. Widget types are engineering work; which widget and which
parameters is generation work.

**Loop position:** FOCUS (as the visual) and DRILL (as "set the parameters that
produce this behavior").

---

### 4.7 The Timeline Scrubber

**What:** A horizontal time axis with events, plotted series, and a scrubber. As
you drag, the panel below shows: what was happening, what people believed at the
time, what they did, and what it cost. Optionally two synced tracks (e.g. the
inflation rate above, policy decisions below).

**Why:** Historical and evolutionary topics are *causal chains through time*, and a
timeline is the only layout whose geometry matches the content. It also enables
the strongest drill in history topics: **"stop here — you're the decision-maker in
March 1980, with only what was known then. What do you do?"**

**Loop position:** FOCUS for narrative topics; DRILL as decision-point stops.

---

### 4.8 The Compare Table (generated on demand)

**What:** A side-by-side of 2–4 things the learner is currently confusing, with
rows chosen for *decision relevance*, not symmetry.

Triggered automatically when the learner's explain-back conflates two nodes.
"You seem to be using Deployment and StatefulSet interchangeably — here's the
difference in the three ways that actually change what you'd write."

**Why:** Most confusion in technical topics is not "I don't know X", it is "I
can't separate X from Y." Contrast is the fastest resolver, and the trigger
condition (detected conflation) makes it feel like the system is reading your mind.

**Loop position:** FOCUS, reactive.

---

### 4.9 The Failure Gallery / Debug Drill

**What:** A broken artifact and the question "what's wrong and why?" — a robot
that oscillates, a pod stuck in `CrashLoopBackOff`, a French sentence with a
subtle agreement error, a policy that made inflation worse.

**Why:** Expertise is largely a library of failure modes. Diagnosis is a *high*
level of cognitive demand and it is the actual job in most technical fields.
Debugging drills also feel like the real thing, which sustains motivation.

**Escalating hints** rather than an answer button: nudge → narrow → reveal. Each
hint level taken is recorded as a signal about node strength.

**Loop position:** DRILL, for verified-level advancement.

---

### 4.10 The Socratic Fork

**What:** Instead of a wall of explanation, a short chain of 2–4 questions that
walk the learner into the idea, each with 2–3 clickable answers, where **wrong
answers are the interesting path**. Picking a wrong answer doesn't say "incorrect"
— it plays out the consequence: "Sure — let's do that. Here's what happens…" and
lands on the contradiction.

**Why:** Self-derived conclusions stick far better than delivered ones. Clickable
answers keep it fast (no typing) while still being generative (P3).

**Use sparingly** — 1 in 5 nodes, at the conceptual crux. Every node as a Socratic
fork is exhausting and slow.

**Loop position:** FOCUS, for the 3–5 hardest nodes in a map.

---

### 4.11 The Atom Deck (retrieval layer)

**What:** Auto-extracted, atomic, review-scheduled items generated from every node
the learner touches, of mixed types:
- cloze ("Kubernetes control loop compares ___ state to ___ state")
- reverse ("Which object gives each pod a stable network identity?")
- application ("Given this symptom, what's the first thing you check?")
- production ("Say in French: I would have gone if I had known")

Surfaced as a short daily session (5 minutes, 12–20 items), not a browsable pile.

**Why:** This is the only mechanism in the document that fights forgetting.
Everything else builds understanding; this preserves it. Without it, week-three
retention of a fast learning sprint is close to zero, and "learned quickly" turns
into "learned and lost quickly."

**Crucially:** a failed atom links back to its source node and flips it to ⚠ Shaky
on the map — closing the loop from RECALL to MAP.

**Loop position:** RECALL.

---

### 4.12 The Scoped Ask Rail

**What:** A persistent question box that is **scoped to the current node** and
knows the learner's history. Answers are short and inline, never a new page. Each
answer offers: *[save as note] [make this a node] [go deeper]*.

**Why:** Curiosity arrives mid-sentence and must be servable in under two seconds
or it is lost — but it must not destroy the learner's place, which is what chat
does. Scoping + inline answers + promote-to-node captures the value of a chatbot
without its structurelessness.

**Loop position:** everywhere.

---

### 4.13 The Session Wrapper: Contract In, Artifact Out

**What:** Every session opens with a one-line contract — *"20 minutes. By the end
you'll be able to read a Kubernetes manifest and say what it does."* — and closes
with a generated artifact the learner keeps: a one-page summary of what they
covered, in their own vocabulary, with the three things they got wrong and the
next three nodes.

**Why:** The opening contract converts vague intent into a testable outcome and
sets expectations for length (huge for perceived speed). The closing artifact
creates a sense of accumulated possession — the strongest driver of returning —
and doubles as the review material.

**Loop position:** wraps everything.

---

### 4.14 Ambient primitives (small, high leverage)

- **Jargon hover.** Every technical term is hoverable for a one-line definition at
  the learner's depth. Removes the need to dumb down prose — the learner can read
  above their level safely, which accelerates them.
- **Streaming with skeletons.** Never a spinner. Structure appears first, prose
  fills in. Perceived speed is most of speed (P8).
- **Speculative pre-generation.** While the learner reads node N, generate N+1 and
  the likely "deeper" variant of N. Makes depth controls feel instant.
- **The "why am I seeing this?" affordance.** One tap on any node explains its
  place in the path. Trust in the sequencing is what stops learners from
  wandering.
- **Time budget on everything.** Every node and session shows an honest minute
  estimate. Learners choose to start things they can finish.

---

## 5. Topic archetypes: different subjects need different default UX

The primitives are universal; the **default composition** should not be. Classify
the topic at calibration time and pick a template. This is what lets one product
serve Kubernetes and French without feeling generic at either.

| Archetype | Nature of the knowledge | Primary primitives | Progress means |
|---|---|---|---|
| **System** (Robotics, how an engine works) | Interacting parts, feedback loops, quantities | Interactive model (4.6), layered diagram, predict-then-reveal (4.5) | You can predict system behavior |
| **Narrative / causal** (Inflation history) | Sequenced causes and consequences over time | Timeline scrubber (4.7), decision points, competing-explanations compare (4.8) | You can explain why it happened and argue it |
| **Tool / procedural** (Kubernetes, Git) | Objects, commands, workflows, failure modes | Terminal sandbox, debug drills (4.9), compare tables (4.8), mental-model diagram | You can do the task and fix it when it breaks |
| **Skill / fluency** (French, chess) | Automaticity through high-volume production | High-frequency short reps, production drills, spaced review (4.11), speech I/O | Your speed and accuracy under time pressure |
| **Self-application** (Motivation, negotiation) | Frameworks applied to your own situation | Personal-case diagnostic, protocol builder, commitment + check-in loop | You changed a behavior and it stuck |

Two practical notes:

- **Most real topics are blends.** Robotics is System + Tool. Kubernetes is Tool +
  System. Compose primitives per *node*, not per topic — the map can mark each node
  with its archetype and pick the drill type accordingly.
- **The archetype determines what "verified" means**, which determines the whole
  progress model. Get this right per topic or the map lies.

---

## 6. Worked examples

Each example shows: the map, the distinctive UX, one node in detail, and the drill
that defines mastery.

### 6.1 Robotics — a System topic

**Learner goal (from calibration):** "I can code, I've never built a robot, I want
to understand how they actually work — and maybe build one."

**Map (~26 nodes, four bands):**

```
SENSE ──────────► THINK ──────────► ACT ──────────► INTEGRATE
encoders          coordinate         DC motors        the control loop
IMU               frames & TF        H-bridge/PWM     latency & timing
LiDAR             kinematics (FK)    servos           SLAM
cameras           inverse kinematics gearing/torque   path planning
sensor noise      state estimation   actuator limits  behavior trees
sensor fusion     PID control                         sim-to-real gap
                  trajectories
```

The map's shape is itself a lesson: **robotics is a loop, not a list.** Render it
as a cycle, and highlight which arc of the loop the current node lives on.

**Distinctive UX: the parameter playground is the main stage.**

Node *PID control* is not prose. It is:

> A cart must reach the line. Here are three sliders: **Kp**, **Ki**, **Kd**.
> Here is the step-response plot, live.
>
> **First, predict:** you triple Kp. Draw what happens to the curve. `[draw]`
>
> *…learner draws a faster, cleaner approach…*
>
> **Now try it.** `[Kp ×3]` — it overshoots and rings. Here's why your intuition
> was reasonable and wrong: proportional force doesn't know about momentum. That's
> the job of the D term. Now add Kd and watch the ringing die.
>
> **Now the real lesson:** turn on `sensor noise`. Your beautiful Kd term now
> amplifies noise into motor chatter. *This* is why real robots are hard — every
> term you add to fix one problem creates another.

That last beat — where the clean idea meets physical reality — is what
distinguishes understanding robotics from reading about it, and it is only
reachable in an interactive primitive.

**Node in detail — *Sensor fusion*, at depth 2:**

- *Plain claim:* Every sensor lies in a different way; fusion means weighting each
  one by how much it should be trusted right now.
- *Visual:* two noisy position traces (IMU drifting smoothly, GPS jittering
  around truth) and the fused estimate threading between them.
- *Mechanism:* IMU error is low-frequency and cumulative; GPS error is
  high-frequency and bounded. A complementary filter takes the high-frequency
  content of one and the low-frequency of the other. A Kalman filter does this
  optimally by tracking uncertainty explicitly.
- *Worked example:* concrete numbers — 2°/min drift over a 10-minute run.
- *Misconception:* "more sensors = better." No — an unmodeled sensor with wrong
  assumed variance actively degrades the estimate.
- Depth controls: **deeper** → the Kalman update equations; **more concrete** →
  50 lines of Python on real logged data.

**Mastery drill:** *"Here's a robot whose arm oscillates when carrying a load but
is stable when empty. Diagnose it."* (Failure gallery, escalating hints. The
answer requires connecting gains, inertia, and gravity compensation — three nodes
at once, which is exactly what "verified" should mean.)

---

### 6.2 Finance: inflation history, impacts and implications — a Narrative / Causal topic

**Learner goal:** "I read the news and don't have a real model. I want to
understand what inflation actually did to people and what it implies for my
decisions."

**Map — organized as eras plus a mechanism spine:**

```
MECHANISM SPINE:  what is inflation ▸ measuring it (CPI/PCE, and their flaws)
                  ▸ demand-pull ▸ cost-push ▸ expectations & the wage-price spiral
                  ▸ monetary transmission ▸ real vs nominal ▸ who wins, who loses

ERAS (each a case study that exercises the spine):
  1920s Weimar hyperinflation ── when money loses its story
  1970s Great Inflation ─────── oil shocks + accommodation + expectations
  1979–82 Volcker shock ─────── the cost of restoring credibility
  1990–2020 Great Moderation ── why everyone stopped worrying
  2021–2023 post-COVID surge ── supply chains, stimulus, and the transitory debate
  Hyperinflation cases ──────── Zimbabwe, Venezuela, Argentina

IMPLICATIONS:  savings & cash ▸ debt (why inflation is a debtor's friend)
               ▸ wages & lag ▸ assets: equities, property, TIPS, gold
               ▸ pensions & the old ▸ policy trade-offs you now have to judge
```

**Distinctive UX: the timeline scrubber with decision stops.**

Main stage is a two-track timeline — CPI year-over-year on top, policy rate and
events below. Scrub to 1979 and the panel shows: inflation 11%, prior decade of
failed attempts, an incoming Fed chair, and *what was believed at the time*.

Then the drill that makes this topic click:

> **You are the Fed chair, October 1979.**
> Inflation is 12%. Unemployment is 6%. Two prior administrations tried price
> controls and jawboning; both failed. Your options:
>
> 1. Raise rates to 20%, accept a recession, break expectations.
> 2. Gradual tightening, hope for a soft landing.
> 3. Wait — oil prices may reverse on their own.
>
> `[choose]` → *You chose 2.* Here's what happened when that was tried in 1974–75:
> inflation fell to 5%, then rebounded to 11% because expectations never
> reset. Each partial attempt taught people that the Fed would blink…
>
> Now here's what Volcker actually did, and what it cost: unemployment to 10.8%,
> the worst recession since the Depression, farm foreclosures, "Wanted" posters
> with his face. And inflation broke — 14% to 3% in three years, and it stayed
> broken for forty.
>
> **The implication you should carry:** credibility is the actual asset. Its price
> is paid once, in a recession.

**Impacts made personal — the distributional widget.** A second signature
primitive: pick a persona (retiree on a fixed pension, homeowner with a 30-year
fixed mortgage, renter, saver in cash, business with inventory) and scrub the same
timeline. The chart shows *their* real position. The lesson that "inflation is not
one event, it is a transfer from lenders and fixed-income holders to borrowers and
real-asset owners" cannot be delivered by a paragraph nearly as well as by
watching the same decade rewrite five different balance sheets.

**Guardrail for this topic:** economics has live disagreements. Where explanations
compete (how much of 2021–23 was stimulus vs supply chains?), the UX must show a
**competing-explanations compare table** with what evidence would distinguish
them — not a single confident narrative. Teaching a contested field as settled is
the fastest way to produce a confidently wrong learner. Also: this is educational
content about economic history, not investment advice, and the closing artifact
should say so plainly.

**Mastery drill:** *"In 4 sentences, explain to a skeptical friend why the 2021
inflation was not the same as the 1970s inflation — and name the one indicator
you'd watch to find out if you're wrong."* (Explain-back + falsifiability. The
second clause is what separates a model from a memorized story.)

---

### 6.3 Kubernetes — a Tool / Procedural topic

**Learner goal (calibration reveals):** backend engineer, knows Docker and Linux,
does not know networking deeply, needs to ship and debug a service next month.

That profile should visibly change the product: Docker nodes collapse to
"known", the analogies come from processes and daemons, networking gets *more*
nodes, not fewer, and the critical path to "deploy and debug a service" is
highlighted while cluster administration is dimmed.

**Map (~30 nodes, dimmed vs. highlighted by goal):**

```
MENTAL MODEL     the reconciliation loop (desired vs actual) ← the master key
                 declarative vs imperative; the API server as the only truth

WORKLOADS        Pod ▸ ReplicaSet ▸ Deployment ▸ StatefulSet ▸ DaemonSet ▸ Job
CONFIG           ConfigMap ▸ Secret ▸ env vs volume ▸ resource requests/limits
NETWORK          ClusterIP ▸ NodePort ▸ LoadBalancer ▸ Ingress ▸ DNS ▸ NetworkPolicy
STORAGE          Volume ▸ PV/PVC ▸ StorageClass
SCHEDULING       node selection ▸ affinity ▸ taints/tolerations ▸ QoS & eviction
OPERATIONS       rollouts & rollback ▸ probes ▸ HPA ▸ RBAC ▸ namespaces
DEBUGGING        the 8 failure modes and the command that reveals each
```

**Distinctive UX #1: one master mental model, taught first and referenced forever.**

Node 1 is not "install kubectl." It is the reconciliation loop, delivered as a
Socratic fork:

> You have 3 copies of a service running. A machine dies. What should happen?
> `[someone gets paged]` `[the system notices and starts a new one]`
>
> → Right. Now: *how* does it notice? Something must continuously compare "3
> wanted" against "2 running." That comparison, run in a loop forever, is
> **all of Kubernetes.** Every object you'll learn is either a *statement of
> desired state* or a *controller reconciling toward it*. When something behaves
> strangely later, your first question is always: **which controller is trying to
> do what, and what does it think the desired state is?**

Every subsequent node carries a one-line callback to this loop. That single
consistent frame is worth more than any ten features.

**Distinctive UX #2: the live cluster is the main stage.**

A sandboxed ephemeral cluster (or a faithful simulator) embedded in the page, with
a state visualizer above and a terminal below. Every node is do-then-see:

```
┌─── cluster view ──────────────────────────────────────┐
│  node-1 [■ web-x ■ web-y]   node-2 [■ web-z]          │
│  Deployment web: desired 3 / ready 3                  │
└───────────────────────────────────────────────────────┘
$ kubectl delete pod web-z
```
> **Predict first:** does `web-z` come back? `[yes]` `[no]`
>
> …watch the visualizer: pod terminates, ReplicaSet notices, new pod `web-q`
> appears on node-2 in 4 seconds. **You didn't do that. The controller did.**

**Distinctive UX #3: failure-first debugging.** The most valuable screen in a
Kubernetes course is a gallery of broken clusters:

| Symptom | The real cause you must find |
|---|---|
| `CrashLoopBackOff` | app exits on startup — bad config, missing secret |
| `ImagePullBackOff` | registry auth or a typo'd tag |
| `Pending` forever | unschedulable: resources, taints, or no PV available |
| `OOMKilled` | limit below actual usage |
| Service returns nothing | selector doesn't match pod labels — the classic |
| Intermittent 502s | readiness probe missing; traffic hits a booting pod |
| Rollout stuck | probe never passes; `maxUnavailable` blocks progress |
| DNS fails in-pod | wrong namespace in the service name |

Each is a live broken cluster. The learner debugs; hints escalate; the drill only
completes when they *fix* it. A learner who has cleared this gallery can do the
job, and that is a far more honest definition of "verified" than any quiz.

**Compare tables fire on conflation:** Deployment vs StatefulSet vs DaemonSet;
ConfigMap vs Secret; requests vs limits; NodePort vs LoadBalancer vs Ingress —
each generated at the moment the learner's own words show they've merged two ideas.

**Mastery drill:** *"Here is a manifest for a service that must survive a node
failure, roll out without downtime, and keep its data. Three things are wrong.
Find them, explain the consequence of each, and fix it."*

---

### 6.4 French — a Skill / Fluency topic

Language is the archetype where the rest of this document's assumptions bend most.
Understanding is not the bottleneck; **volume of production and retrieval speed
are.** The UX must therefore optimize for reps per minute, not clarity per screen.

**Map — dual-axis, because language has two orthogonal progressions:**

```
CAN-DO AXIS (functional, what the learner wants)
  introduce myself ▸ order food ▸ get around ▸ shop ▸ small talk
  ▸ tell a story in the past ▸ express opinions ▸ hypothesize ▸ argue

SYSTEM AXIS (structural, what makes it possible)
  sounds & liaison ▸ gender & articles ▸ present tense ▸ negation ▸ questions
  ▸ passé composé vs imparfait ▸ pronouns (the hard wall) ▸ future ▸ subjunctive
  ▸ conditional & si-clauses

VOCABULARY: frequency-ranked, 0–1000 ▸ 1000–2000 ▸ 2000–5000, plus a personal deck
```

Show both axes with separate progress. Learners quit when they can conjugate but
cannot speak; the dual map keeps functional ability visible as a first-class goal.

**Distinctive UX #1: the session is mostly reps, not explanation.**
A 15-minute session is roughly: 2 minutes of new pattern, 10 minutes of varied
production, 3 minutes of spaced review. The Concept Card exists, but it is short
and rare. **Explanation is a tool for unblocking production, not the main event.**

**Distinctive UX #2: production modes in a rotation** (variety prevents the
plateau where you can do the exercise type but not the language):
- **Speak the prompt** (mic in, pronunciation + fluency feedback on liaison and
  vowels — French rewards this heavily)
- **Type the translation**, graded semantically rather than string-matched:
  *"'je suis allé au magasin' is correct too — both work here; yours is slightly
  more formal."*
- **Fill the gap in context**, never in an isolated sentence
- **Listen and transcribe**, at adjustable speed, because comprehension at native
  speed is the real wall
- **Free response to a situation**, with corrections shown as a diff of the
  learner's sentence, not a rewrite

**Distinctive UX #3: the error-driven curriculum.** The system tracks *your*
recurring errors — gender on `-ion` nouns, `à`/`de` after verbs, avoir/être
auxiliary choice, adjective placement — and generates today's drills from your own
top three. This is the single biggest difference between a language app and a
tutor, and an LLM backend makes it trivially available.

**Distinctive UX #4: comprehensible input, tuned to you.** A short generated
story/dialogue at ~90% known vocabulary, seeded with today's target structure and
your recent error patterns, with tap-to-gloss on every word. This is where
volume-of-exposure happens, and it must feel like reading, not studying.

**Node in detail — *passé composé vs imparfait*, the classic wall:**

Do not lead with rules. Lead with contrast:
> *"Je mangeais quand il est arrivé."* — one of these is a background, one is an
> event. Which is which? `[tap the background]`

Then the frame: **imparfait paints the scene, passé composé moves the plot.** Then
15 rapid "which one, and why" reps from a story, then production, then a
generated paragraph where the learner picks every verb form and gets a diff. The
rule is *derived*, stated once, then drilled — not stated, then illustrated.

**Mastery drill:** timed. *"Tell me about your last holiday, 45 seconds, out
loud."* Feedback on fluency (pauses, self-corrections), accuracy, and range —
because in a fluency topic, **speed under pressure is the definition of knowing.**

---

### 6.5 Motivation — a Self-Application topic

The trap here is enormous: a beautifully explained map of motivation theory that
changes nothing. For this archetype, **understanding is not the goal and must not
be the measured outcome.** Behavior change is.

**Map — three layers, and the last one is the point:**

```
UNDERSTAND (kept deliberately small — 6 nodes, not 20)
  intrinsic vs extrinsic ▸ autonomy/competence/relatedness ▸ expectancy × value
  ▸ why motivation follows action (not the reverse) ▸ identity-based habits
  ▸ the real enemies: ambiguity, fear of failure, depletion, low self-efficacy

DIAGNOSE (personal, and this is where the product earns its keep)
  what specifically are you avoiding? ▸ which failure pattern is yours?
  ▸ when does it break down — start, middle, or under setback?

BUILD (the actual deliverable)
  make it concrete ▸ shrink the first step ▸ design the environment
  ▸ implementation intentions ▸ recovery-from-lapse protocol ▸ progress you can see
```

**Distinctive UX #1: a diagnostic, not a lecture.** The session opens with the
learner's real case, not with theory:
> "Name one thing you've been meaning to do and haven't. Be specific."
> → *"I keep not working on my side project."*
>
> "When you sit down to do it, what actually happens?"
> `[I don't sit down at all]` `[I sit down and drift]` `[I start and abandon it]`
> `[I do it once, then not again for weeks]`

Each branch is a different problem with a different fix. Branch 1 is usually a
too-large first step or an undefined next action. Branch 2 is environment and
ambiguity. Branch 3 is often perfectionism or an unclear definition of done.
Branch 4 is a missing cue and no recovery protocol. **Naming the learner's actual
pattern is the moment the product becomes credible**, and every subsequent piece of
theory arrives attached to their own case.

**Distinctive UX #2: theory is delivered as diagnosis, never as curriculum.**
> "You said you'd 'work on the project.' That's not a task — it's a category.
> Ambiguity is the most common motivation failure and it's mistaken for laziness
> almost every time. What is the *first physical action*? Not 'design the schema' —
> 'open the editor and write the users table.'"

Six nodes of theory, each surfacing only when the learner's own answer summons it.

**Distinctive UX #3: the output is a protocol, not a summary.** The session ends
with a generated, editable, one-screen plan in the learner's own words:

```
TRIGGER    After I close my laptop at work on Tue/Thu
ACTION     Open the repo and write ONE test. That's the whole commitment.
FLOOR      If I don't want to: 5 minutes, then I'm allowed to stop.
FRICTION   Repo stays open in a pinned tab; phone in the other room.
LAPSE      Missing one session is expected. Missing two = the step is too big;
           halve it. Never "start again Monday."
EVIDENCE   Tick the calendar. Two weeks of ticks, then we review.
```

**Distinctive UX #4: the loop extends past the session.** Motivation is the one
archetype where the product must follow up. A scheduled check-in — "It's Thursday.
Did the session happen?" `[yes]` `[no]` `[partly]` — and *the "no" branch is the
valuable one*: it triggers a short diagnostic that revises the protocol rather
than delivering encouragement. Over four weeks this produces something no article
can: a plan that has been debugged against the learner's actual life.

**Mastery is not a quiz.** It is: *did the behavior happen, and did it survive a
lapse?* The map's progress ring for this topic tracks completed sessions and
recoveries — not concepts read. Design the metric to match the archetype or the
product will feel insightful and be useless.

**Tone guardrail:** be a coach, not a cheerleader. No fake enthusiasm, no
manipulative streak-guilt, no dark patterns around missed days. And there is a
real boundary here: persistent inability to act, especially with low mood or
anhedonia, is not a motivation-design problem, and the product should say so
plainly and suggest talking to someone qualified rather than generating another
protocol.

---

## 7. Backend and LLM generation architecture

The UX above implies a specific backend shape. Three ideas carry most of the weight.

### 7.1 Generate structured objects, not prose

Every primitive corresponds to a **typed artifact** with a schema. The LLM fills
the schema; the frontend renders it deterministically. This is what makes the
experience feel like a product rather than a chat window.

```jsonc
// ConceptCard
{
  "node_id": "sensor_fusion",
  "depth": 2,                       // 1 intuition … 5 expert
  "plain_claim": "…one sentence…",
  "visual": { "type": "chart|diagram|timeline|code|widget", "spec": { } },
  "mechanism": ["…", "…", "…"],
  "worked_example": { "setup": "…", "steps": ["…"], "result": "…" },
  "misconception": { "belief": "…", "why_wrong": "…", "correction": "…" },
  "jargon": [ { "term": "complementary filter", "gloss_at_depth": "…" } ],
  "callbacks": ["control_loop"],    // links to the topic's master mental model
  "next_suggested": ["kalman_filter", "imu_drift"]
}
```

Other core schemas: `KnowledgeMap` (nodes, edges, archetype per node, minutes),
`Drill` (type, prompt, reference model, rubric, hint ladder), `Evaluation`
(got / vague / missing / wrong + evidence spans + node deltas), `Atom` (cloze,
answer, source node, difficulty), `Widget` (widget type + parameters + expected
behavior), `Protocol` (for self-application topics).

**Why this matters:** typed artifacts are cacheable, diffable, re-renderable at a
new depth, and gradable. Free prose is none of those things.

### 7.2 The learner model is the real product state

```jsonc
{
  "topic": "kubernetes",
  "goal": "deploy and debug a service in production",
  "time_budget": "3 weeks, ~30 min/day",
  "known_domains": ["docker", "linux", "python", "ci_cd"],
  "weak_domains": ["networking", "tls"],
  "default_depth": 3,
  "preferred_analogies": ["unix processes", "git"],
  "node_states": { "pod": "verified", "service": "shaky", "ingress": "untouched" },
  "misconceptions": [
    { "text": "thinks Service routes by pod name, not label selector",
      "evidence": "explain-back 2026-03-04", "status": "open" }
  ],
  "error_patterns": ["conflates Deployment/StatefulSet"],
  "review_queue": [ { "atom_id": "…", "due": "2026-03-07", "ease": 2.3 } ]
}
```

Every generation call takes this as context. **Personalization is entirely a
function of what goes into the prompt**, so the quality of this object is the
quality of the product. It should be inspectable and editable by the learner (P7).

### 7.3 Layered generation with aggressive caching

Not everything needs to be generated live, and cost/latency both punish you if
you pretend otherwise.

| Layer | Cached? | Latency budget | Notes |
|---|---|---|---|
| Topic map skeleton | shared across learners, per topic | pre-built | Personalize by pruning/reordering, not regenerating |
| Concept card @ depth D | cache per (node, depth, archetype) | < 1s streamed | Personalize with a thin overlay: analogies + callbacks |
| Widget specs | cached per node | pre-built | Fixed widget library; LLM picks type + params |
| Drills | generate a pool per node, sample | pre-generated | Never show the same drill twice |
| **Evaluation of learner production** | never cached | 1–3s | The one call that *must* be live and high-quality |
| Compare tables, ask-rail answers | opportunistic cache | < 2s | Triggered by detected conflation or a question |
| Atoms | derived from cards at generation time | free | Extract when the card is made, not later |

**Speculative generation** is the trick that makes it feel fast: when a learner
opens node N, immediately queue N's "deeper" variant and the top-2 successor
nodes. Depth buttons then feel instant, which changes how much people explore —
and exploration at will is most of what makes this better than a course.

### 7.4 Quality controls

- **Two-pass for anything factual.** Generate, then verify against a retrieved
  source; for the finance topic, real series (CPI, unemployment, policy rates)
  should come from a data store, not from the model's memory. Never let the LLM
  invent a number that appears on a chart.
- **Reference models for grading.** Evaluation calls should compare the learner's
  answer against a stored reference decomposition of the node, not free-judge it.
  Far more consistent, and it makes the got/vague/missing/wrong diff possible.
- **Pin depth and vocabulary explicitly** in the prompt. "Depth 3" must mean the
  same thing across nodes or the experience feels erratic.
- **Contested-claim tagging.** Nodes carry a `contested: true` flag that forces the
  competing-explanations layout instead of a single narrative (essential for
  economics, nutrition, history, social science).
- **Human review of map skeletons** for high-traffic topics. Maps are few, shared,
  and high-leverage — the one place where hand-curation clearly pays for itself.

---

## 8. The memory model: making it stick

"Learn quickly" is worthless if it decays in ten days. Three mechanisms, in order
of importance:

1. **Retrieval over review.** Every returning session starts with 5 minutes of
   generated retrieval (not re-reading), mixed across nodes. Interleaving across
   nodes is measurably better than blocking on one — and it is free to generate.
2. **Spacing driven by failure.** Standard scheduling (expanding intervals, ease
   adjusted by performance), with the crucial UX link: a failed atom flips its
   source node to ⚠ Shaky on the map, which reopens the FOCUS surface. Retention
   failures become visible work, not invisible decay.
3. **Generation effects.** The learner's own explain-backs, their protocol, their
   summary artifacts — all stored and re-surfaced. Re-reading *your own words from
   three weeks ago* is a better review cue than any generated text, and it makes
   the accumulated artifacts feel like a growing possession.

Add one non-obvious mechanic: **the honesty check.** Occasionally show a node the
learner marked "I already know this" and ask them to explain it. It keeps the map
truthful, which is the foundation of P1.

---

## 9. Anti-patterns: things that look good in a demo and fail in week two

| Anti-pattern | Why it fails |
|---|---|
| **The infinite chat** | No map, no state, no floor. Fluency mistaken for learning. |
| **Wall-of-text generation** | The LLM will happily produce 900 words. Nobody reads them. Cap the card; put depth behind buttons. |
| **Quiz-as-assessment** | Multiple choice measures recognition. Use production drills; MCQ only for speed reps in fluency topics. |
| **Fake progress bars** | Progress that advances by scrolling destroys trust in the map, which is the product's core asset. |
| **One template for all topics** | French drills and Kubernetes debugging are not the same interaction. Archetype the topic (section 5). |
| **Gamification instead of progress** | Streaks and confetti substitute a false reward for a real one. Show *capability* gained; that is the actual reward. |
| **Depth locked at onboarding** | Level is per-node and per-moment, not per-person. Keep depth controls on every card. |
| **Hallucinated specifics** | Wrong numbers on a chart or a fabricated `kubectl` flag destroy credibility instantly. Ground facts; two-pass verify. |
| **Latency** | An 8-second card kills exploration, and exploration is the whole advantage over a course. Stream, skeleton, pre-generate. |
| **Generated content that vanishes** | If the learner can't find last week's card, nothing accumulates. Everything is addressable and saved. |
| **Teaching contested things as settled** | Produces confident wrongness. Flag and show the disagreement. |

---

## 10. Build order

If you build this incrementally, this sequence gets value out earliest and derisks
the hard parts first.

**v0 — the spine (proves the concept).**
Calibration probe → generated knowledge map with status → concept cards with depth
controls → explain-back drill with a got/vague/missing/wrong diff → node status
updates. One archetype only: pick **Tool/procedural** (Kubernetes), because its
correctness is checkable and its audience is patient with rough edges.

*If v0 doesn't feel dramatically better than a chatbot, nothing later will fix it —
the map + explain-back loop is the whole thesis.*

**v1 — retention.** Atom extraction, spaced review sessions, shaky-node feedback
into the map, session summary artifacts. This is what turns a good demo into
something people return to.

**v2 — archetype templates.** Timeline scrubber (narrative), parameter playground
+ widget library (system), production rotation + speech I/O (fluency),
diagnostic + protocol + check-ins (self-application). Each is a real chunk of
engineering; do them one at a time and validate each with its example topic.

**v3 — depth and polish.** Sandboxed execution environments, grounded data
sources for factual charts, speculative pre-generation, compare-table triggers on
detected conflation, the inspectable/editable learner model.

---

### The one-sentence version

Give the learner a **visible, honest map** of the subject; deliver **one small
concept at a time at a depth they control**; make them **produce something** on
every node and tell them precisely what was missing; and **schedule the
retrieval** that keeps it. Everything else in this document is an elaboration of
those four sentences, tuned per topic archetype.
