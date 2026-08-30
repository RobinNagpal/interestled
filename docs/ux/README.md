# UX for Learning Any Topic Fast

How to design a learning app when an LLM backend can generate any content on demand.

Content is now cheap. What is hard is showing the right thing, in the right order,
and making sure it sticks. That is a UX problem, not a content problem.

---

## What we are fixing

**Chatbots** feel great and teach little. You only get answers to questions you
already knew to ask. Nothing tracks what you understood. Nothing makes you produce
anything, so nothing sticks.

**Courses** have structure but are slow and generic. A backend engineer and a
product manager get the same Module 1. You must walk the whole tree to reach the
one thing you needed.

We want the structure of a course, the speed of a chat, and the memory mechanics of
flashcards.

---

## Eight rules

1. **Always show the map.** A visible list of what exists and what you know turns
   "I should learn X" into a shrinking list. This speeds people up more than better
   explanations do.
2. **One job per screen.** Not a map, chat, quiz and diagram at once.
3. **Make the learner produce.** Reading feels like knowing and is not. Every node
   ends with typing, saying, choosing or building something.
4. **Ask for a guess before showing the answer.** The gap between guess and truth is
   what makes it stick. Cheap to build, works almost everywhere.
5. **Depth is a button, not a setting.** Every explanation has *simpler*, *deeper*,
   *example*, *why it matters*. This lets one product serve a 5-minute skim and a
   deep dive.
6. **Measure the level, don't ask for it.** People guess their own level badly. Read
   it from what they write.
7. **Show the learner what you think they know.** And let them fix it. That is your
   cheapest personalisation signal.
8. **Fast and plain beats slow and pretty.** Stream everything. Pre-generate the
   likely next screen.

---

## The loop

```
MAP     what exists, what I know, what is next
  ↓     pick a node
FOCUS   one concept, one screen, depth buttons
  ↓     now prove it
DRILL   explain it back, predict, debug, translate → targeted feedback
  ↓     result updates the map
RECALL  short daily mixed review; failures reopen the node
```

Three rules keep it working:

- **One trip round the loop is 3–8 minutes.** Small nodes mean frequent wins.
- **Drill is not optional.** Reading cannot mark a node as known, or the map lies.
- **The system picks the review**, not the learner.

**Layout:** a map rail on the left, one thing on the main stage, and an "ask
anything" box on the right that is scoped to the current node. Answers appear
inline, so a question never loses your place. Any answer can become a new map node,
so curiosity grows the map instead of derailing it.

---

## The building blocks

**Calibration probe (60 seconds, at the start).** Not a level dropdown. Five quick
questions: do you know these words, what do you want to do with this, how much time
do you have, and — the most useful one — *what related things do you already use?*
That last answer decides which comparisons will land.

**Knowledge map.** 15–40 nodes with dependencies. Each node is Untouched, Seen,
Explained, Verified, Due, or Shaky. Three key actions: *"I already know this"*
shrinks the map; *"just get me to X"* lights up the shortest path and dims the rest;
questions can be added as new nodes.

**Concept card.** One concept, one screen, always the same six slots: a one-line
claim, one visual, why it behaves this way, one concrete example with real numbers,
the thing people usually get wrong, and the depth buttons. The fixed shape means the
eye stops hunting. It also forces the LLM to produce the two parts usually missing:
the mechanism and the misconception.

**Explain-back.** "Say this in your own words." The best drill we have. Do not score
it. Return a diff:

```
✓ Got:     the causal direction
△ Vague:   "makes it faster" — faster than what, and why?
✗ Missing: the constraint that makes this needed at all
✗ Wrong:   B causes A here, not A causes B → [correction + example]
```

This kills the illusion of understanding, and it hands you the learner's
misconception in their own words — the best possible input for the next explanation.

**Predict, then reveal.** Before any chart, command output or result, ask for a
guess. Then show the truth and explain the gap.

**Playground.** One to three sliders and a live picture. Some ideas are
relationships between numbers, and ten seconds of moving a slider beats any
paragraph. The LLM does not run the simulation — it picks a widget from a fixed
library and sets its parameters.

**Timeline.** For anything historical. Drag through time; see events, what people
believed then, and what it cost. Stop at a decision point and let the learner decide.

**Compare table.** Fires automatically when someone's own words show they have
merged two ideas. Most confusion is not "I don't know X" but "I can't separate X
from Y."

**Broken thing to fix.** A robot that wobbles, a crashing pod, a wrong sentence.
Expertise is mostly a library of failure modes. Give hints in steps, never an answer
button.

**Guided questions.** For the 3–5 hardest nodes only: two or three clickable
questions that walk into the idea, where a wrong answer plays out its consequence
instead of saying "incorrect."

**Review deck.** Small facts pulled out of every node you touch, mixed into a
5-minute daily session. This is the only part that fights forgetting. A failed item
marks its node Shaky on the map, so decay becomes visible work.

**Session wrapper.** Open with a promise — "20 minutes, and you'll be able to read a
Kubernetes manifest." Close with a one-page summary in the learner's own words. The
promise sets the length; the summary is what makes them come back.

**Small things that matter a lot.** Hover any jargon for a one-line meaning, so
people can safely read above their level. Skeletons, never spinners. Generate the
next node while they read this one, so depth buttons feel instant. Honest minute
estimates on everything — people start things they can finish.

---

## Five kinds of topic

The blocks are universal. Which ones you use is not.

| Kind | Main blocks | "Known" means |
|---|---|---|
| **System** (robotics) | Playground, layered diagram, predict | You can predict how it behaves |
| **Story** (inflation history) | Timeline, decision stops, compare | You can explain why, and argue it |
| **Tool** (Kubernetes) | Sandbox, broken things to fix, compare | You can do it and fix it when it breaks |
| **Skill** (French) | High-volume reps, speech, spaced review | Speed and accuracy under time pressure |
| **Self-help** (motivation) | Personal diagnosis, a written plan, check-ins | You changed a behaviour and it survived a slip |

Two notes. Most topics are blends, so tag the **node**, not the topic. And the kind
decides what "known" means — get that wrong and the map lies about progress.

---

## Five examples

### Robotics — a System topic

**Map:** draw it as a loop, not a list, because that is what robotics is.
Sense (encoders, IMU, cameras, noise, fusion) → Think (frames, kinematics, state
estimation, PID) → Act (motors, PWM, gearing, limits) → Integrate (timing, SLAM,
planning, sim-to-real).

**The signature screen is a playground, not text.** PID control is three sliders and
a live plot:

> Predict: you triple Kp. Draw the new curve. → *You drew a faster, clean approach.*
> Now try it — it overshoots and rings. Your guess was reasonable but proportional
> force does not know about momentum; that is the D term's job.
>
> Now switch on **sensor noise**. Your new D term turns that noise into motor
> chatter. This is why real robots are hard: every fix creates a new problem.

That last beat is the difference between understanding robotics and reading about it.

**Sample node — sensor fusion.** Claim: every sensor lies differently, so weigh each
by how much it can be trusted right now. Visual: a drifting IMU trace, a jumpy GPS
trace, and the fused line threading between them. Mechanism: IMU error is slow and
piles up; GPS error is jumpy but bounded; take the fast part of one and the slow part
of the other. Wrong belief: "more sensors is better" — a sensor with the wrong
assumed error makes the estimate worse.

**Mastery drill:** "This arm wobbles when carrying a load but is steady when empty.
Find the fault." It needs gains, inertia and gravity together — three nodes at once.

### Inflation history — a Story topic

**Map:** one spine of mechanisms (what inflation is, how it is measured and why that
is flawed, demand-pull, cost-push, expectations, how rates transmit, real vs nominal,
who wins and loses), then eras that exercise the spine (Weimar, the 1970s, the
Volcker shock, the calm 1990s–2010s, the 2021–23 surge), then implications for
savings, debt, wages, assets and pensions.

**Signature screen: a timeline with decision stops.** Prices on top, policy and
events below. Scrub to 1979 and you get the numbers *and what people believed then*.
Then:

> **You are the Fed chair, October 1979.** Inflation 12%, unemployment 6%, two failed
> attempts behind you. (1) Rates to 20% and accept a recession. (2) Tighten slowly.
> (3) Wait for oil to fall.
>
> *You picked 2.* That was tried in 1974–75. Inflation fell to 5%, then went back to
> 11%, because each half-attempt taught people the Fed would blink.
>
> What Volcker did cost 10.8% unemployment and the worst recession since the 1930s.
> Inflation went from 14% to 3% and stayed down for forty years. **The lesson:
> credibility is the real asset, and you pay for it once.**

**Second signature screen: pick a person, then scrub.** A pensioner, a homeowner with
a fixed mortgage, a renter, someone holding cash. Watch the same decade rewrite five
different balance sheets. "Inflation moves money from lenders to borrowers" lands far
harder as a picture than as a sentence.

**Guardrail:** where economists still disagree — how much of 2021 was stimulus versus
supply chains — show the competing explanations side by side, with what evidence
would settle it. Teaching an open question as settled produces confident, wrong
learners. This is history, not investment advice.

**Mastery drill:** "In four sentences, tell a sceptical friend why 2021 was not the
1970s — and name the one number that would prove you wrong." The second half is what
turns a memorised story into a model.

### Kubernetes — a Tool topic

Calibration says: backend engineer, knows Docker and Linux, weak on networking, needs
to ship next month. The product should visibly change — Docker nodes collapse to
known, comparisons come from Linux processes, networking gets *more* nodes, and the
path to "deploy and debug a service" lights up while cluster admin dims.

**Teach one master idea first, then reference it forever.** Node 1 is not "install
kubectl":

> Three copies are running. A machine dies. What should happen? → *The system notices
> and starts a new one.* → How does it notice? Something must keep comparing "3
> wanted" against "2 running". **That comparison, running forever, is all of
> Kubernetes.** Everything else is either a statement of what you want or a
> controller working towards it. When something is odd later, always ask: which
> controller, and what does it think you want?

**The cluster is the main stage.** A live sandbox with a picture of the cluster above
and a terminal below. Every node is do-then-see:

> `kubectl delete pod web-z` — **first, does it come back?** Watch: the pod dies, the
> ReplicaSet notices, a new pod appears in four seconds. You did not do that. The
> controller did.

**Broken clusters are the most valuable screen.** `CrashLoopBackOff` (bad config),
`ImagePullBackOff` (auth or typo), stuck `Pending` (nothing can schedule it),
`OOMKilled` (limit too low), a Service returning nothing (selector does not match the
labels — the classic), random 502s (no readiness probe), a stuck rollout, DNS failing
(wrong namespace). Each is a live broken cluster the learner must actually fix.
Clearing this gallery is a far better definition of "known" than any quiz.

**Mastery drill:** "This manifest must survive a node failure, roll out with no
downtime, and keep its data. Three things are wrong. Find them, say what each one
would cost you, and fix them."

### French — a Skill topic

Language breaks the rest of this document's assumptions. Understanding is not the
bottleneck; **volume of production is**. Optimise for reps per minute, not clarity per
screen.

**Two maps side by side.** What you can *do* (introduce yourself → order food → tell a
story in the past → argue a point) and what makes it possible (sounds, gender,
tenses, pronouns, subjunctive). People quit when they can conjugate but cannot speak,
so keep both visible.

**A 15-minute session is 2 minutes of pattern, 10 of production, 3 of review.**
Explanation exists only to unblock production.

**Rotate the production mode** so people do not get good at the exercise instead of
the language: speak it aloud with feedback on liaison and vowels; type a translation
graded on meaning, not exact strings; fill a gap inside a real paragraph; listen and
transcribe at adjustable speed; answer a situation freely and get your own sentence
marked up rather than replaced.

**Drills come from your own mistakes.** The system tracks your recurring errors —
gender on `-ion` nouns, `à` vs `de`, avoir/être — and builds today's practice from
your top three. This is the main difference between an app and a tutor, and an LLM
makes it free.

**Sample node — passé composé vs imparfait.** Do not start with the rule. Start with
*"Je mangeais quand il est arrivé"* — one is the background, one is the event, tap
the background. Then the frame: **imparfait paints the scene, passé composé moves the
plot.** Then fifteen fast reps, then free production. Derive the rule, then drill it.

**Mastery drill:** "Tell me about your last holiday. 45 seconds. Out loud." In a skill
topic, speed under pressure *is* knowing.

### Motivation — a Self-help topic

The trap is a beautifully explained theory that changes nothing. Here, understanding
is not the goal and must not be the measure.

**Start with a diagnosis, not a lecture.**

> "Name one thing you keep meaning to do." → *"My side project."*
> "When you sit down, what actually happens?"
> `[I never sit down]` `[I sit down and drift]` `[I start and abandon]` `[I do it
> once, then not for weeks]`

Each branch is a different problem: a first step that is too big, an unclear next
action, perfectionism, or a missing cue. **Naming their actual pattern is the moment
they trust the product.**

**Theory arrives as diagnosis, never as curriculum.** Six ideas total, each shown only
when the learner's own answer calls for it:

> You said you would "work on the project". That is a category, not a task. Vagueness
> is the most common cause of not starting, and it gets mistaken for laziness almost
> every time. What is the first physical action? Not "design the schema" — "open the
> editor and write the users table."

**The output is a plan, not a summary.**

```
WHEN     After I close my laptop on Tue/Thu
DO       Open the repo, write ONE test. That is the whole commitment.
FLOOR    If I don't want to: 5 minutes, then I may stop.
SETUP    Repo in a pinned tab. Phone in another room.
IF I SLIP  One miss is normal. Two misses means the step is too big — halve it.
           Never "restart on Monday."
PROOF    Tick the calendar. Review after two weeks.
```

**Then follow up.** "It's Thursday. Did it happen?" `[yes] [no] [partly]`. The "no"
branch is the valuable one: it re-runs the diagnosis and edits the plan instead of
offering encouragement. After a month you have something no article can give — a plan
debugged against this person's real life.

**Progress is sessions done and slips recovered**, not concepts read. And be a coach,
not a cheerleader: no fake enthusiasm, no guilt over broken streaks. If someone
cannot act at all, especially with low mood, that is not a motivation-design problem —
say so and point them to a professional.

---

## Backend

**Generate typed objects, not prose.** The LLM fills a schema; the frontend renders
it the same way every time. That is what makes it feel like a product instead of a
chat window. Typed objects are also cacheable, re-renderable at a new depth, and
gradable — prose is none of those.

```jsonc
// ConceptCard
{ "node_id": "sensor_fusion", "depth": 2,
  "claim": "...", "visual": { "type": "chart|diagram|timeline|code|widget", "spec": {} },
  "mechanism": ["...", "..."],
  "example": { "setup": "...", "result": "..." },
  "misconception": { "belief": "...", "correction": "..." },
  "jargon": [ { "term": "...", "gloss": "..." } ],
  "callback": "control_loop", "next": ["kalman_filter"] }
```

Also needed: `KnowledgeMap`, `Drill` (with a reference answer and a hint ladder),
`Evaluation` (got / vague / missing / wrong), `Atom`, `Widget`, `Plan`.

**The learner model is the real product state.** Goal, time budget, what they already
know, current depth, per-node status, open misconceptions with the evidence for each,
recurring errors, review queue. Every generation call reads this. Personalisation is
entirely what you put in the prompt, so this object *is* the product. Let the learner
see and edit it.

**Cache aggressively; only one call must be live.**

| Layer | Cached |
|---|---|
| Topic map | Shared across learners; personalise by pruning, not regenerating |
| Concept card per (node, depth) | Yes, with a thin per-learner overlay for comparisons |
| Widget specs, drill pools, review items | Pre-generated |
| **Grading what the learner wrote** | **Never — this one must be live and good** |

**Pre-generate ahead.** While they read node N, build N's *deeper* version and the
next two nodes. Depth buttons then feel instant, which changes how much people
explore — and free exploration is the whole advantage over a course.

**Quality:** never let the model invent a number that appears on a chart — pull real
series from a data store and verify facts against a source. Grade against a stored
reference answer, not the model's free judgement, or scoring drifts between nodes.
Flag contested nodes so they render as competing views. Hand-check the map for your
top topics; maps are few and high-leverage.

---

## Making it stick

Speed is worthless if it fades in ten days.

1. **Start each session by recalling, not re-reading.** Five minutes, mixed across
   nodes. Mixing beats drilling one node, and it costs nothing to generate.
2. **Space by failure.** Widening intervals, and a failed item flips its node to
   Shaky on the map so forgetting becomes visible work.
3. **Re-show the learner their own words.** Their old explain-backs are better review
   cues than any generated text, and the growing pile feels like something they own.
4. **Spot-check the skips.** Occasionally ask them to explain a node they marked
   "already know". The map must stay honest, because everything rests on it.

---

## What not to do

| Mistake | Why it fails |
|---|---|
| Endless chat | No map, no memory, no floor |
| 900-word answers | Nobody reads them. Cap the card, hide depth behind buttons |
| Multiple-choice as the test | Measures recognition. Make them produce |
| Progress bars that move when you scroll | Kills trust in the map, which is the whole asset |
| One template for every topic | French reps and Kubernetes debugging are not the same thing |
| Streaks and confetti | A fake reward crowding out the real one. Show what they can now do |
| Level fixed at signup | Level is per node and per moment |
| Invented numbers or flags | One wrong `kubectl` flag ends your credibility |
| Eight-second loads | Kills exploration, and exploration is the point |
| Content that vanishes | If last week's card is unfindable, nothing accumulates |
| Open questions taught as settled | Produces confident, wrong learners |

---

## Build order

**v0 — the spine.** Calibration → map with status → concept cards with depth buttons
→ explain-back with a diff → status updates. One topic kind only: pick a **Tool**
topic like Kubernetes, because correctness is checkable and the audience tolerates
rough edges. *If this does not already feel much better than a chatbot, nothing later
will fix it.*

**v1 — retention.** Review items, spaced sessions, Shaky nodes, session summaries.
This is what turns a good demo into something people return to.

**v2 — the other topic kinds.** Timeline, playground and widget library, speech and
rep rotation, diagnosis and plans and check-ins. Each is real engineering; do one at a
time and validate it against its example topic.

**v3 — polish.** Live sandboxes, real data behind charts, pre-generation, automatic
compare tables, an editable learner model.

---

**In one line:** show an honest map, teach one small thing at a depth they control,
make them produce something on every node and tell them exactly what was missing,
then schedule the recall that keeps it.
