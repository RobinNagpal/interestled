# ADHD Learning Guidelines

Design rules for keeping an ADHD learner engaged, with the evidence behind each one
and what to build. Companion to [README.md](./README.md).

ADHD is not a shortage of attention. It is attention that follows **interest,
novelty, urgency and challenge** rather than importance. Four traits shape every
choice here:

- **Weak working memory.** Meta-analyses find moderate-to-large deficits, largest in
  spatial working memory (Martinussen 2005; Kasper 2012). Holding anything in the
  head is expensive.
- **Time blindness.** Time estimation and reproduction are reliably impaired
  (Toplak 2006 meta-analysis). An unknown length feels infinite.
- **Delay aversion.** ADHD shows steeper delay discounting — a smaller reward now
  beats a bigger one later (Sonuga-Barke 1992; Marx 2021 meta-analysis). A payoff
  next week does not motivate today.
- **Inconsistent performance.** The most robust lab finding in ADHD is not being
  slower but being *more variable* — reaction times swing far more, trial to trial
  and day to day (Kofler 2013 meta-analysis).

Most of these fixes help everyone. They are only *essential* for ADHD learners.

### How to read the evidence tags

| Tag | Meaning |
|---|---|
| **[strong]** | Meta-analysis or a large replicated literature |
| **[moderate]** | Real studies, but fewer, smaller, or with mixed replication |
| **[inference]** | No direct study. Derived from a well-supported mechanism — treat as a design bet, not a fact |

Full references at the end. Where a finding is contested, I say so rather than
hiding it.

---

## 20 things that work

### 1. Open with the most interesting thing, not the first thing
**Evidence [strong].** Loewenstein's information-gap theory says curiosity comes from
a felt gap in knowledge, not from being told something matters. Kang (2009) and
Gruber (2014) found that high-curiosity states improve memory for the answer *and*
for unrelated material learned at the same time, with matching activity in
dopamine-linked midbrain and hippocampus.

**Design**
- Node 1 of every topic is a surprising fact or a live demo, never a definition or a
  setup step.
- The map's suggested next node is picked partly on "interesting", not only on
  "prerequisite order".
- Every concept card opens with the one-line claim, so the point arrives before any
  context does.

### 2. Make the unit small enough to finish
**Evidence [strong].** Mayer's segmenting principle: the same material in
learner-paced chunks beats one continuous run. Guo (2014), across 6.9 million video
watching sessions on edX, found median engagement peaks around six minutes and falls
sharply after — regardless of total video length.

**Design**
- Hard cap a node at ~3 minutes of content; split anything longer.
- Every node ends with a visible completion state, not a scroll into the next one.
- Show node count remaining on the path, so "finishable" is visible before starting.

### 3. Say how long it takes before they start
**Evidence [strong].** Time estimation is impaired in ADHD (Toplak 2006), so an
unlabelled task has no felt end. Combined with delay aversion (Sonuga-Barke 2003),
an open-ended task reads as an unbounded cost and gets avoided.

**Design**
- A minute estimate on every node, path and review session — measured from real
  completion data, not guessed.
- The session opens with a contract: "12 minutes, 4 nodes, and you'll be able to X."
- A progress bar that fills against *that* estimate, so time passing is visible
  rather than felt.

### 4. Make the first action tiny and physical
**Evidence [strong].** Gollwitzer & Sheeran's meta-analysis of ~94 studies found
implementation intentions — a specific "when X, I do Y" — produced a medium-to-large
effect (d ≈ 0.65) on goal attainment over intention alone. The gain comes from
removing the decision at the moment of action.

**Design**
- The first interaction of a session is one keystroke or one drag, never a page of
  reading.
- Resume presents a single pre-filled action ("finish this sentence"), not a menu.
- In the motivation topic, the generated plan must name a physical first action;
  reject "work on the project" at generation time.

### 5. Change format every few minutes
**Evidence [moderate-strong].** Zentall's optimal stimulation theory holds that ADHD
behaviour is partly a search for stimulation in under-stimulating conditions, and
that added novelty improves on-task performance. Bunzeck & Düzel (2006) showed novel
stimuli activate the substantia nigra/VTA — the same dopaminergic region implicated
in ADHD reward signalling (Volkow 2009).

**Design**
- The session builder rotates format: never two consecutive screens of the same type.
- Track a "same-format streak" counter and force a switch at three.
- Keep at least four interaction shapes per topic: read, predict, manipulate, speak.

### 6. Give feedback within a second
**Evidence [moderate].** Luman's review of reinforcement in ADHD finds performance is
unusually sensitive to reinforcement timing and that delayed reward degrades it more
than in controls. Honest caveat: in neurotypical lab studies, *delayed* feedback
sometimes beats immediate for complex material (Kulik & Kulik 1988), so this applies
to drills and reps, not necessarily to essay-length work.

**Design**
- Drill grading is the one uncached, always-live backend call — budget under one
  second.
- Show partial feedback while the rest streams; never a spinner over a finished answer.
- Sliders and playgrounds respond on the same frame as the drag. No apply button.

### 7. Let them jump anywhere on the map
**Evidence [moderate].** Patall's meta-analysis (2008) found providing choice raises
intrinsic motivation and effort. For ADHD specifically, interest is the thing that
recruits attention at all, so an order imposed against current interest costs more
than the missing prerequisite does.

**Design**
- No locked nodes, ever. A missing prerequisite shows as an inline note with a "get
  it in 90 seconds" link.
- If they open something too advanced, generate a simplified version of *that node*
  rather than redirecting them.
- Log the jumps: repeated jumps to one area are the strongest signal of their real goal.

### 8. Keep hands and mouth busy
**Evidence [moderate-strong].** Sarver & Rapport (2015) found that in children with
ADHD, *more* gross motor activity predicted better working memory performance —
fidgeting appears to be compensatory arousal, not just noise. Separately, the
generation effect (Slamecka & Graf 1978) shows self-produced answers are remembered
far better than read ones.

**Design**
- Every node ends in production — typing, dragging, or speaking. No node completes by
  scrolling.
- Offer voice input for explain-back; speaking is lower-friction than typing for many.
- Prefer a draggable slider over a static chart wherever the concept is a relationship.

### 9. Put everything they need on the screen
**Evidence [strong].** ADHD working memory deficits are well established (Martinussen
2005; Kasper 2012). The split-attention effect (Chandler & Sweller) shows that
forcing learners to integrate two separated sources hurts learning independently of
the content. Barkley's model frames ADHD as an executive-function problem where
externalising information is the primary compensation.

**Design**
- Any rule, formula or value needed on screen 4 stays visible on screen 4 — repeat it,
  do not link back to it.
- The current goal and node title are always in the frame.
- Drills carry their own context inline; never "recall the value from the last card".

### 10. Add mild urgency
**Evidence [strong].** Sergeant's cognitive-energetic model predicts ADHD performance
depends heavily on event rate, and studies consistently find slow event rates hurt
ADHD groups disproportionately while fast rates narrow the gap with controls.

**Design**
- Put a visible countdown on speed reps and recall items only.
- Keep the pace of prompts brisk — the next item appears immediately after feedback.
- Never put a timer on a concept card or an explain-back (see anti-pattern 19).

### 11. Protect hyperfocus
**Evidence [moderate].** Hyperfocus is now a documented and measured phenomenon in
ADHD (Hupfeld 2019; Ashinoff & Abu-Akel 2021), described as intense, sustained
absorption in a high-interest task. The literature is young, but the practical point
holds: these episodes are where the learning happens, and they are hard to re-enter
once broken.

**Design**
- No scheduled breaks, no "great job!" interstitials, no session-length nags.
- Detect a run of fast, correct, continuous activity and suppress every non-essential
  interruption during it.
- Always have the next node pre-generated, so momentum never waits on a load.

### 12. Make stopping safe
**Evidence [strong].** Altmann & Trafton's memory-for-goals model and Mark's
interruption studies (2008) both show resumption carries a real cost: an interrupted
task needs its goal state reconstructed. For a working-memory-limited learner, that
reconstruction is the expensive part.

**Design**
- Save on every keystroke; a mid-drill exit loses nothing.
- Re-entry shows a restore point — the question, their partial answer, and one line
  of what they had just worked out — not a summary or a dashboard.
- No "are you sure you want to leave" dialogs. Leaving must be as cheap as staying.

### 13. Show one thing at a time
**Evidence [strong].** Mayer's coherence principle: removing interesting-but-unneeded
material *improves* learning, across many replications. The seductive-details effect
(Rey 2012 meta-analysis) confirms that attractive extras actively cost comprehension.

**Design**
- The main stage holds one concept, one visual, one action. Everything else collapses.
- No related-links panel, no tips sidebar, no badge counters during a node.
- The map rail dims to near-invisible while a drill is active.

### 14. Pose a puzzle before explaining
**Evidence [strong].** Pretesting works: Richland (2009) and Kornell (2009) found that
attempting an answer and *failing* before being taught produces better retention than
studying the material for the same time. The failed attempt appears to prime the
memory for the answer.

**Design**
- Layer predict-then-reveal on every chart, command output and result — this is the
  cheapest high-value pattern in the product.
- Open the hardest 3–5 nodes per topic with a guided question, where a wrong choice
  plays out its consequence instead of saying "incorrect".
- Never penalise a pretest guess. It is a learning device, not an assessment.

### 15. Use surprise and story
**Evidence [strong].** Dopamine neurons fire to *prediction error* — the gap between
expectation and outcome — not to reward itself (Schultz 1997). Emotional arousal at
encoding improves later recall through noradrenergic mechanisms (Cahill & McGaugh
1995).

**Design**
- Every concept card carries a "what people get wrong" slot; write it as a
  contradiction of the obvious answer.
- Use the real human stakes where they exist — Volcker's recession, a robot destroyed
  by a sign error.
- Generate the guess step first, then the reveal, so the content is built around the
  gap rather than having it bolted on.

### 16. Remove choices
**Evidence [contested — read the caveat].** Iyengar & Lepper (2000) famously found
shoppers bought jam ten times more often from a display of 6 than of 24. But
Scheibehenne's meta-analysis (2010) found the average choice-overload effect across
studies is close to zero, and the effect depends on conditions. What survives is
narrower and enough for us: more options means more decision time and more
deferral — and task initiation is already the expensive step in ADHD.

**Design**
- One primary button per screen. Everything else is smaller and secondary.
- Resume goes straight into the next node; it never opens a chooser.
- Keep the map's *browsing* freedom (see point 7) but always offer one default
  suggestion, so choosing is optional rather than required.

### 17. Move fast and pack it in
**Evidence [moderate].** Sustained attention deficits in ADHD are well established
(Huang-Pollock 2012 meta-analysis), and performance degrades with time on task.
Zentall's work suggests under-stimulation drives off-task behaviour. The practical
consequence: at a given moment, boredom is a bigger risk than confusion, because
confusion is recoverable and disengagement is not.

**Design**
- Write cards slightly denser and faster than feels comfortable; let the *simpler*
  button catch anyone who needs more.
- Cut all warm-up, recap and transition prose from generated content.
- Track drop-off per node — a node people quit on is usually too slow, not too hard.

### 18. Let them skip what they know
**Evidence [moderate].** Cen (2007), working with Cognitive Tutor data, showed
students substantially over-practise already-mastered skills and that removing that
over-practice saves large amounts of time with no loss of learning. For an ADHD
learner the cost is worse than wasted time: it is disengagement.

**Design**
- "I already know this" on every node — one tap, marks it known, collapses its
  prerequisites, shrinks the map.
- The calibration probe should collapse whole branches up front, so a learner who
  knows Docker never sees a Docker node.
- Spot-check skipped nodes occasionally in review, so the map stays honest without
  forcing anyone to sit through them.

### 19. Show progress as something concrete
**Evidence [strong].** Locke & Latham's goal-setting theory: specific, concrete goals
outperform vague ones consistently. Kivetz (2006) showed effort accelerates as a
*visible* endpoint approaches — but that requires the endpoint to be real and
legible.

**Design**
- State progress as new ability: "you can now debug a stuck rollout", not "68%".
- The map's status dots are the progress bar — they cannot be advanced by scrolling.
- End every session with the artefact listing what they can now do that they could
  not before.

### 20. Make coming back after a gap painless
**Evidence [moderate].** The what-the-hell effect (Cochran & Tesser 1996) and the
abstinence-violation effect from relapse research both describe the same pattern: one
lapse against a standard triggers abandonment of the whole goal. Emotion dysregulation
is present in a large share of adults with ADHD (Shaw 2014), which raises the cost of
that moment considerably.

**Design**
- No streaks, no "you lost your progress", no guilt copy anywhere.
- A two-week absence opens with "here are the three things worth reloading" and one
  tap back into a node.
- The review queue silently reschedules after an absence instead of presenting a
  backlog of 200 overdue items.

---

## 20 things that do not work

### 1. Long unbroken text
**Evidence [strong].** Mind-wandering rises with time on a text and predicts worse
comprehension (Smallwood & Schooler 2006). Bozhilova's review (2018) finds
spontaneous mind-wandering is elevated in ADHD and tracks symptom severity.

**Design**
- Cap a card's mechanism section at ~5 lines; put everything else behind *deeper*.
- Break any list of more than three items into a table or a diagram.
- If generated text exceeds the cap, regenerate rather than scroll.

### 2. Payoff at the end
**Evidence [strong].** ADHD shows steeper delay discounting across many studies
(Marx 2021 meta-analysis). "Read this, then we'll test you" places the entire reward
past the point where it can pull anyone through the reading.

**Design**
- Every node pays out within it — a correct prediction, a working command, a
  visible status change.
- Never gate feedback behind finishing a set of questions.
- Reserve nothing valuable for "the end of the course". There is no end of the course.

### 3. Tasks with no defined finish
**Evidence [strong].** Goal-setting research is unambiguous that vague goals ("do your
best", "explore this") produce worse performance than specific ones. Without an edge,
there is no way to know you are done, so the task never feels startable.

**Design**
- Every drill states its completion condition in the prompt itself.
- Ban open verbs in generated task text: "explore", "review", "familiarise", "look at".
- A free-play playground always ships with a specific challenge attached.

### 4. Locked steps
**Evidence [moderate].** Same basis as works-7: choice supports intrinsic motivation
(Patall 2008), and enforced sequence conflicts with the interest that is doing the
attentional work.

**Design**
- Replace gates with warnings you can walk past.
- Where a prerequisite is genuinely load-bearing, inline a 60-second version of it
  rather than sending them away.
- Let the map be entered from any node via search.

### 5. Warm-ups and preambles
**Evidence [inference, from a strong base].** No study measures "preambles" directly.
But sustained attention declines with time on task (Huang-Pollock 2012) and curiosity
must be established to get the memory benefit (Gruber 2014) — so the opening minute is
the most valuable and the most easily wasted.

**Design**
- Prompt the LLM to forbid opening context: no history, no "in this section we will".
- Deliver context *after* the hook, and only the part that is needed now.
- Kill all objectives slides. The session contract (one line) replaces them.

### 6. Long video
**Evidence [strong].** Guo (2014): engagement drops sharply past ~6 minutes, and
shorter videos are watched far more completely. Szpunar (2013, PNAS) found that
inserting short tests into a lectured segment roughly halved self-reported mind
wandering and improved final test performance.

**Design**
- No video over two minutes, and always with a transcript that is scannable.
- If a longer explanation is unavoidable, interrupt it with a question every ~90
  seconds — this is a documented fix, not a guess.
- Prefer an interactive widget to a video wherever the concept allows it.

### 7. Note-taking as the main activity
**Evidence [moderate].** Piolat (2005) shows note-taking imposes high cognitive load,
competing with comprehension for the same resources. Honest caveat: the well-known
longhand-beats-laptop result (Mueller & Oppenheimer 2014) failed to replicate at scale
(Morehead 2019), so do not over-claim the writing-modality part.

**Design**
- Generate the notes. The learner's writing effort goes into explain-back instead,
  which is retrieval rather than transcription.
- One-tap "save this" on any card or answer, so capture costs nothing.
- The session summary is written in the learner's own words, pulled from what they typed.

### 8. Relying on them to come back
**Evidence [strong].** Prospective memory — remembering to do a thing later — is
reliably impaired in ADHD (Talbot & Kerns 2014; and meta-analytic reviews since). An
intention to return is not a plan to return.

**Design**
- The system initiates: a scheduled nudge at a time they picked, tied to a specific
  next node, not a generic "come back".
- Nudge content names the thing: "3 minutes: why your rollout got stuck."
- Every nudge is one tap into the node itself, never into a home screen.

### 9. Streaks and daily guilt
**Evidence [moderate].** Deci's meta-analysis of 128 studies found tangible,
performance-contingent rewards reliably undermine intrinsic motivation. Combine that
with the what-the-hell effect (works-20) and a streak becomes a mechanism that first
replaces interest with obligation, then punishes a single miss. Honest note: I know of
no direct trial of streak mechanics in ADHD populations — this is two strong findings
pointed at one feature.

**Design**
- No streaks, no points, no leaderboards. Show capability gained instead.
- If a cadence is shown at all, show it as neutral history, with missed days unmarked.
- Never use loss framing ("don't lose your progress") in any notification.

### 10. Dead time
**Evidence [moderate].** Nielsen's response-time limits are the standard: ~1 second
keeps thought uninterrupted, ~10 seconds is the limit of attention on a task.
Industry latency-abandonment data points the same way. For an attention-fragile
learner, a tab switch during a load is usually the end of the session.

**Design**
- Stream every generation with a skeleton of the card's fixed slots. Never a spinner.
- Pre-generate the next node and the *deeper* variant while they read the current one.
- If a call will exceed ~3 seconds, show the parts that are ready rather than waiting.

### 11. Several instructions at once
**Evidence [strong].** Following multi-step spoken instructions is a well-studied
working-memory task, and performance tracks working-memory span closely (Gathercole's
work) — precisely the capacity reduced in ADHD.

**Design**
- One instruction per screen; the next appears after the first is done.
- Multi-step tasks render as a checklist with the current step highlighted, so nothing
  is held in the head.
- Never combine a rule and its application in the same sentence.

### 12. Rules that must be carried across screens
**Evidence [strong].** The split-attention effect (Chandler & Sweller 1992): separating
information that must be used together imposes load and measurably reduces learning.

**Design**
- Repeat rather than reference. Duplicating a formula costs nothing; a lookup costs
  the session.
- A drill's prompt embeds every value it needs.
- Jargon hover gives the definition in place — no navigation to a glossary.

### 13. Busy screens
**Evidence [strong].** The coherence and seductive-details literature (Mayer; Rey 2012
meta-analysis) shows added interesting-but-irrelevant material lowers comprehension.
Distractor susceptibility is a defining ADHD feature.

**Design**
- One primary visual per card. If a second seems necessary, it is a second node.
- Hide navigation chrome during drills.
- No notifications, badges or animations from elsewhere in the app during a session.

### 14. Setup before starting
**Evidence [inference, from a strong base].** Task initiation is the documented
bottleneck in ADHD executive function, and every added pre-step is another initiation
cost paid before any reward arrives. Product funnel data everywhere shows steps cost
completion.

**Design**
- Calibration is under 60 seconds and is itself interesting — no forms, no wizards.
- Nothing is configured up front that could be inferred later from behaviour.
- Sign-in comes after the first node, not before it.

### 15. Repeating what they already know
**Evidence [moderate].** Over-practice of mastered skills is measurable and wasteful
(Cen 2007). Under-stimulation drives off-task behaviour (Zentall), so for this
audience boredom is an exit, not an inefficiency.

**Design**
- Adapt on evidence: two correct applications of a node, stop drilling it and move it
  to spaced review.
- Never show a review item that has been answered correctly three times in a row until
  its interval is genuinely due.
- Make "skip" always available and never guilt-framed.

### 16. Vague progress numbers
**Evidence [strong].** Goal specificity drives performance (Locke & Latham), and the
goal-gradient effect needs a legible endpoint to work on (Kivetz 2006). "68% of an
unknown total" supplies neither.

**Design**
- Progress is a count of real nodes and a list of real abilities.
- Show what remains, not just what is done — the remaining count is the motivating half.
- Never let a percentage move without a node changing status.

### 17. Harsh marking
**Evidence [strong].** Kluger & DeNisi's meta-analysis of over 600 effect sizes found
that roughly a third of feedback interventions *reduced* performance, with
self-directed feedback the main culprit. Emotion dysregulation affects a large share
of adults with ADHD (Shaw 2014), raising the cost of shame-triggering feedback further.

**Design**
- Feedback is the got/vague/missing/wrong diff — about the answer, never about the
  person. No scores, no percentages, no red crosses.
- Lead with what they got right, then what is missing. Always in that order.
- A wrong answer routes into a correction and a retry, never into a failure state.

### 18. Assuming today matches yesterday
**Evidence [strong].** Elevated intra-individual variability is among the most
replicated findings in ADHD (Kofler 2013 meta-analysis). A bad session is expected
noise, not a trend.

**Design**
- Difficulty adapts within a session on the current signal, not on last week's average.
- Never compare a learner to their own past pace in any user-visible copy.
- On a bad run, drop to shorter nodes and easier reps automatically — no comment on it.

### 19. Timers on understanding
**Evidence [strong].** Beilock & Carr (2005) showed pressure causes "choking"
specifically on tasks that depend on working memory, and hits high-working-memory
strategies hardest. A learner already short on working memory is exactly the wrong
person to put a clock on.

**Design**
- Timers appear only on speed reps and vocabulary recall.
- Explain-back, concept cards and debugging drills are never timed and never show
  elapsed time.
- The 45-second French speaking task is the deliberate exception: in a fluency topic,
  speed under pressure *is* the skill being measured.

### 20. "Just focus" framing
**Evidence [moderate-strong].** ADHD has measurable neurobiological correlates,
including reduced dopamine reward-pathway markers in adults (Volkow 2009, JAMA).
Effort-blaming feedback is also self-directed feedback, the category Kluger & DeNisi
identified as most likely to hurt performance.

**Design**
- Ban effort language in all generated copy: "focus", "try harder", "be disciplined",
  "stay committed".
- When someone stalls, the system changes the task — smaller step, different format —
  and says so plainly, rather than encouraging.
- In the motivation topic, always attribute a stall to the design of the task, and
  route persistent inability to act, especially with low mood, to a professional
  rather than to another plan.

---

## What this changes in our design

Six concrete edits to the main design:

- **Nodes get shorter** — 3 minutes, not 8 — and each shows its minute cost up front.
- **The map never locks.** Missing prerequisites are a note on the node, not a gate.
- **Format rotates within a session**, enforced by a same-format counter.
- **Review is opt-in and tiny** — three items, not twenty — and skipping costs nothing.
- **Return is a restore point**, not a summary: what you were doing, one tap to resume.
- **No streaks anywhere.** Progress is stated as new ability, never as days in a row.

Two existing features already do this job and should be protected: **depth buttons**,
which let a sudden interest run as far as it wants, and **explain-back**, which is
active production and holds attention far better than any reading screen.

---

## References

Altmann & Trafton (2002), *Memory for goals*, Cognitive Science.
Ashinoff & Abu-Akel (2021), *Hyperfocus: the forgotten frontier of attention*, Psychological Research.
Barkley (1997), *Behavioral inhibition, sustained attention, and executive functions*, Psychological Bulletin.
Beilock & Carr (2005), *When high-powered people fail*, Psychological Science.
Bozhilova et al. (2018), *Mind wandering perspective on ADHD*, Neuroscience & Biobehavioral Reviews.
Bunzeck & Düzel (2006), *Absolute coding of stimulus novelty in the human SN/VTA*, Neuron.
Cahill & McGaugh (1995), *A novel demonstration of enhanced memory associated with emotional arousal*, Consciousness and Cognition.
Cen, Koedinger & Junker (2007), *Is over practice necessary?*, AIED.
Chandler & Sweller (1992), *The split-attention effect as a factor in the design of instruction*, British Journal of Educational Psychology.
Cochran & Tesser (1996), *The "what the hell" effect*, in Striving and Feeling.
Deci, Koestner & Ryan (1999), *A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation*, Psychological Bulletin.
Gathercole et al. (2008), *Working memory and following instructions*, Educational Psychology.
Gollwitzer & Sheeran (2006), *Implementation intentions and goal achievement: a meta-analysis*, Advances in Experimental Social Psychology.
Gruber, Gelman & Ranganath (2014), *States of curiosity modulate hippocampus-dependent learning*, Neuron.
Guo, Kim & Rubin (2014), *How video production affects student engagement*, ACM Learning at Scale.
Huang-Pollock et al. (2012), *Evaluating vigilance deficits in ADHD: a meta-analysis*, Journal of Abnormal Psychology.
Hupfeld, Abagis & Shah (2019), *Living in the zone: hyperfocus in adult ADHD*, ADHD Attention Deficit and Hyperactivity Disorders.
Iyengar & Lepper (2000), *When choice is demotivating*, JPSP — see Scheibehenne below.
Kang et al. (2009), *The wick in the candle of learning*, Psychological Science.
Kasper, Alderson & Hudec (2012), *Moderators of working memory deficits in children with ADHD: a meta-analytic review*, Clinical Psychology Review.
Kivetz, Urminsky & Zheng (2006), *The goal-gradient hypothesis resurrected*, Journal of Marketing Research.
Kluger & DeNisi (1996), *The effects of feedback interventions on performance*, Psychological Bulletin.
Kofler et al. (2013), *Reaction time variability in ADHD: a meta-analytic review*, Clinical Psychology Review.
Kornell, Hays & Bjork (2009), *Unsuccessful retrieval attempts enhance subsequent learning*, JEP: LMC.
Kulik & Kulik (1988), *Timing of feedback and verbal learning*, Review of Educational Research.
Locke & Latham (2002), *Building a practically useful theory of goal setting*, American Psychologist.
Loewenstein (1994), *The psychology of curiosity*, Psychological Bulletin.
Luman, Oosterlaan & Sergeant (2005), *The impact of reinforcement contingencies on AD/HD*, Clinical Psychology Review.
Mark, Gudith & Klocke (2008), *The cost of interrupted work*, CHI.
Martinussen et al. (2005), *A meta-analysis of working memory impairments in children with ADHD*, JAACAP.
Marx et al. (2021), *Meta-analysis of delay discounting in ADHD*, Neuroscience & Biobehavioral Reviews.
Mayer (2009), *Multimedia Learning* — segmenting and coherence principles.
Morehead, Dunlosky & Rawson (2019), *How much mightier is the pen than the keyboard?* — failed replication of Mueller & Oppenheimer.
Patall, Cooper & Robinson (2008), *The effects of choice on intrinsic motivation*, Psychological Bulletin.
Piolat, Olive & Kellogg (2005), *Cognitive effort during note taking*, Applied Cognitive Psychology.
Rey (2012), *A review and meta-analysis of the seductive detail effect*, Educational Research Review.
Richland, Kornell & Kao (2009), *The pretesting effect*, JEP: Applied.
Sarver, Rapport et al. (2015), *Hyperactivity in ADHD: impairing deficit or compensatory behavior?*, Journal of Abnormal Child Psychology.
Scheibehenne, Greifeneder & Todd (2010), *Can there ever be too many options? A meta-analytic review of choice overload*, Journal of Consumer Research.
Schultz (1997), *A neural substrate of prediction and reward*, Science.
Sergeant (2005), *Modeling ADHD: a critical appraisal of the cognitive-energetic model*, Biological Psychiatry.
Shaw et al. (2014), *Emotion dysregulation in ADHD*, American Journal of Psychiatry.
Slamecka & Graf (1978), *The generation effect*, JEP: Human Learning and Memory.
Smallwood & Schooler (2006), *The restless mind*, Psychological Bulletin.
Sonuga-Barke et al. (1992), *Hyperactivity and delay aversion*, Journal of Child Psychology and Psychiatry.
Szpunar, Khan & Schacter (2013), *Interpolated memory tests reduce mind wandering*, PNAS.
Talbot & Kerns (2014), *Event- and time-based prospective memory in children with ADHD*, Journal of Pediatric Psychology.
Toplak, Dockstader & Tannock (2006), *Temporal information processing in ADHD*, Journal of Neuroscience Methods.
Volkow et al. (2009), *Evaluating dopamine reward pathway in ADHD*, JAMA.
Zentall & Zentall (1983), *Optimal stimulation*, Psychological Bulletin.

*This is interaction-design guidance drawn from published research on attention,
memory and ADHD. It is not clinical or diagnostic advice. Where I have tagged a point
[inference], no study tests that design choice directly.*
