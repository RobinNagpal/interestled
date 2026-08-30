# ADHD Learning Guidelines

Design rules for keeping an ADHD learner engaged. Companion to [README.md](./README.md).

ADHD is not a shortage of attention. It is attention that follows **interest,
novelty, urgency and challenge** rather than importance. Three other traits shape
every design choice here: weak working memory (holding things in the head is
expensive), time blindness (an unknown length feels infinite), and low tolerance
for delayed reward (a payoff next week does not motivate today).

Most of these fixes make the product better for everyone. They are only *essential*
for ADHD learners.

---

## 20 things that work

**1. Open with the most interesting thing, not the first thing.**
Interest starts attention; importance does not. Lead Kubernetes with a machine dying
and pods reappearing, not with installing a CLI.

**2. Make the unit small enough to finish.**
Finishing is the reward. Three minutes with an ending beats thirty minutes of good
material with no clear stop.

**3. Say how long it takes before they start.**
Unknown length is the main reason a task never gets started. "4 minutes" removes the
fear of falling into a hole.

**4. Make the first action tiny and physical.**
"Type one word" or "drag this slider" gets a body moving. Momentum is easier to
continue than to create.

**5. Change format every few minutes.**
Read, then predict, then drag, then say it out loud. Novelty is fuel — the same
input for ten straight minutes stops registering.

**6. Give feedback within a second.**
Reinforcement that arrives late does not attach to the action. Instant response is
what makes a loop compelling.

**7. Let them jump anywhere on the map.**
Curiosity is the engine, so do not fight the order it chooses. Show which
prerequisites are missing as a note, not a locked door.

**8. Keep hands and mouth busy.**
Typing an answer, dragging a value, speaking a sentence — active output holds
attention far longer than reading does.

**9. Put everything they need on the screen.**
Never make them carry a rule, number or goal from one screen to the next. Working
memory is the scarcest resource; spend it on the subject.

**10. Add mild urgency.**
A visible countdown on a *drill* — not on understanding — converts a flat task into
something the brain treats as worth doing now.

**11. Protect hyperfocus.**
When someone is deep in it, do not interrupt with a scheduled break or a "great job"
popup. Let them run; those hours are where most of the learning happens.

**12. Make stopping safe.**
Save mid-task, and on return show "you were here, this is what you'd just worked
out." Fear of losing progress is why people avoid starting.

**13. Show one thing at a time.**
Everything visible competes. One concept, one visual, one action; hide the rest.

**14. Pose a puzzle before explaining.**
An open question creates a gap the brain wants closed. "Why does this robot wobble
only when loaded?" holds attention that a definition cannot.

**15. Use surprise and story.**
Emotion tags memory. A fact that contradicts an expectation is remembered; a neutral
fact is not.

**16. Remove choices.**
One obvious next button. A menu of six good options is where a session ends.

**17. Move fast and pack it in.**
Boredom drops out faster than difficulty does. Go slightly quicker than feels right
and let the depth buttons catch anyone who needs more.

**18. Let them skip what they know.**
Being made to sit through known material is genuinely intolerable and is a common
reason people quit. One tap to mark it known and move on.

**19. Show progress as something concrete.**
"You can now debug a stuck rollout" lands. "68% complete" does not.

**20. Make coming back after a gap painless.**
No lost streak, no guilt, no restart. "Here are the three things worth reloading" and
straight back in — a two-week gap must cost nothing.

---

## 20 things that do not work

**1. Long unbroken text.**
Eyes move, nothing enters. Any block over roughly six lines is skipped, not read.

**2. Payoff at the end.**
"Read this, then we'll test you" fails because the reward is too far away to pull
anyone through the reading.

**3. Tasks with no defined finish.**
"Explore this section" gives no stopping point, so it never starts. Every task needs
an edge.

**4. Locked steps.**
Forcing Module 1 before Module 2 blocks the exact impulse — "I want to know this
now" — that you should be exploiting.

**5. Warm-ups and preambles.**
History, motivation and objectives before the content will lose the session. Earn the
context by starting with the thing.

**6. Long video.**
Fixed pace, no skimming, no scanning back. If video is used, keep it under two
minutes and always ship a transcript.

**7. Note-taking as the main activity.**
Writing notes and following an explanation compete for the same attention. Generate
the notes for them.

**8. Relying on them to come back.**
Out of sight is genuinely out of mind. The system must reach out, or the second
session never happens.

**9. Streaks and daily guilt.**
One missed day and the streak dies, and the shame keeps them away for a month. The
mechanic punishes exactly the people it claims to help.

**10. Dead time.**
An eight-second load is enough to switch to another tab and not return. There is no
recovering that session.

**11. Several instructions at once.**
"Open X, change Y, then compare with Z" loses everything after the first clause. One
instruction, one action.

**12. Rules that must be carried across screens.**
If a formula shown on screen 2 is needed on screen 4, it must still be on screen 4.

**13. Busy screens.**
Sidebars, badges, related links and tips all pull. Visual noise is a direct tax on
concentration.

**14. Setup before starting.**
Long onboarding, preference forms and goal wizards spend the one burst of motivation
that got them to open the app.

**15. Repeating what they already know.**
Boredom is not a minor cost here — it is an exit.

**16. Vague progress numbers.**
A percentage of an unknown total tells them nothing and motivates nothing.

**17. Harsh marking.**
Red crosses and low scores trigger shame, and shame ends sessions. Say what was
missing, not how wrong they were.

**18. Assuming today matches yesterday.**
ADHD performance swings hugely day to day. A system that treats a bad day as falling
behind is wrong and demoralising.

**19. Timers on understanding.**
Urgency helps someone start a drill; a clock on comprehension causes panic and
blanking. Never time the thinking.

**20. "Just focus" framing.**
Advice to try harder, and any tone that treats difficulty as a character flaw, is both
useless and the fastest way to lose the learner for good.

---

## What this changes in our design

Six concrete edits to the main design:

- **Nodes get shorter** — 3 minutes, not 8 — and each shows its minute cost up front.
- **The map never locks.** Missing prerequisites are a note on the node, not a gate.
- **The format rotates inside a session**, so no two consecutive screens feel the same.
- **Review is opt-in and tiny** — three items, not twenty — and skipping it costs
  nothing.
- **Return is a restore point**, not a summary: what you were doing, one tap to resume.
- **No streaks anywhere.** Progress is stated as new ability, never as days in a row.

Two things stay exactly as they are: **depth buttons**, which let someone follow a
sudden interest as far as it goes, and **explain-back**, which is active output and
holds attention better than any reading screen.

*This is interaction-design guidance drawn from how ADHD attention works. It is not
clinical or diagnostic advice.*
