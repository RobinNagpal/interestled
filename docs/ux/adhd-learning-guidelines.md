# ADHD Learning Guidelines

Why ADHD learners disengage, what the research says, and exactly how to fix it.
Companion to [README.md](./README.md).

ADHD is not a shortage of attention. It is attention that follows **interest,
novelty, urgency and challenge** rather than importance. Four traits shape every
point below:

- **Weak working memory.** Meta-analyses find moderate-to-large deficits, largest in
  spatial working memory (Martinussen 2005; Kasper 2012). Holding anything in the
  head is expensive.
- **Time blindness.** Time estimation and reproduction are reliably impaired
  (Toplak 2006). An unknown length feels infinite.
- **Delay aversion.** ADHD shows steeper delay discounting — a smaller reward now
  beats a bigger one later (Sonuga-Barke 1992; Marx 2021). A payoff next week does
  not motivate today.
- **Inconsistent performance.** The most robust lab finding in ADHD is not being
  slower but being *more variable* — reaction times swing far more, trial to trial
  and day to day (Kofler 2013).

Most of these fixes help everyone. They are only *essential* for ADHD learners.

**Each point has three parts:** what actually happens, the evidence, and two ways to
solve it — each with a worked example showing how the learning is structured. The
solutions are medium-independent: they apply to a book, a class, a tutor or an app.
What our own product does is in one short section [at the end](#what-this-means-for-our-product).

Every solution appears exactly once. Where two points look similar, they are fixing
different mechanisms, and the examples show the difference.

### How to read the evidence tags

| Tag | Meaning |
|---|---|
| **[strong]** | Meta-analysis or a large replicated literature |
| **[moderate]** | Real studies, but fewer, smaller, or with mixed replication |
| **[inference]** | No direct study. Derived from a well-supported mechanism — a design bet, not a fact |

Full references at the end. Where a finding is contested, I say so.

---

## 20 things that work

### 1. Open with the most interesting thing, not the first thing

**What happens.** Attention is not handed out by a judgement about importance. It is
recruited by a felt gap — the sense that there is something here you cannot yet
explain. Telling someone a topic matters is an abstract argument competing with
everything else in their head, and it usually loses. Showing them something they
cannot account for creates an itch instead. In ADHD the importance route is weaker,
so the interest route carries almost the whole load.

**Evidence [strong].** Loewenstein's information-gap theory ties curiosity to a
perceived gap in one's own knowledge. Kang (2009) and Gruber (2014) found high
curiosity improves memory both for the answer and for unrelated material encountered
at the same moment.

**How to solve it**

- **Lead with the anomaly or the finished result, and supply background only when it
  is needed to explain it.**
  *Kubernetes:* do not open with "what is a container". Open by deleting a running
  pod and watching a replacement appear four seconds later, then ask "who did that?"
  Controllers now get explained as the answer to a question the learner is holding,
  instead of as chapter one.

- **Choose the starting point from what the learner came for, not from the subject's
  dependency order.**
  *Music theory:* someone who came to play one song starts on the four chords of that
  song. Key signatures arrive later, at the moment they want to sing it lower and
  have to transpose. Starting at the circle of fifths is correct for a reference book
  and wrong for this learner.

### 2. Make the unit small enough to finish

**What happens.** Attention decays on continuous input, but the thing that matters
most is the *boundary*. Without endings, material becomes an undifferentiated stream
with no point at which anything can be banked as done. Before mastery arrives,
completion is the only reward available — remove it and there is nothing to work for.

**Evidence [strong].** Mayer's segmenting principle: the same material in
learner-paced chunks beats one continuous run. Guo (2014), across 6.9 million edX
video sessions, found median engagement peaks around six minutes and falls sharply
after — regardless of the video's total length.

**How to solve it**

- **Cut by idea, and give each unit an outcome that can be checked.**
  *Photography:* replace one 40-minute lesson on exposure with three units — shutter
  speed (outcome: blur or freeze motion on purpose), aperture (outcome: control what
  is sharp), ISO (outcome: shoot indoors without ruining the shot). Each ends with
  one photograph the learner took deliberately, so "done" is a thing they can look at.

- **Where the content genuinely cannot be split, impose artificial stopping points.**
  *Causes of WWI:* a causal chain has no independent parts, so break it at each
  decision instead — "Austria has drafted the ultimatum; what does Russia do?" The
  learner banks a conclusion at every break rather than carrying forty minutes of
  unresolved narrative.

### 3. Say how long it takes before they start

**What happens.** Starting is a cost-benefit judgement, and when the cost side is
unknown the mind fills it in as "large". Someone who cannot estimate duration
internally has no way to bound that cost, so an unlabelled task reads as endless and
gets deferred.

**Evidence [strong].** Time estimation and reproduction are impaired in ADHD
(Toplak 2006). Combined with delay aversion (Sonuga-Barke 2003), an open-ended task
is an unbounded cost against a distant reward — the worst possible shape.

**How to solve it**

- **State an honest duration before asking for commitment, in terms of what it buys.**
  *French:* "Six minutes: enough to order a coffee and understand the answer." Not
  "Unit 3: café vocabulary." One inflated estimate destroys trust in every later one,
  so measure it rather than guessing.

- **Bound the unit by a countable amount rather than by time spent.**
  *Reading a textbook:* "four pages tonight" is far easier to begin than "read for an
  hour", because four pages can be seen and counted while an hour has to be felt.

### 4. Make the first action tiny and physical

**What happens.** The hard part is the transition into the task, not the task.
Starting means generating an action out of nothing; continuing only means not
stopping. A first step that contains a decision — "work out what to do first" —
reintroduces exactly the executive cost you were trying to avoid.

**Evidence [strong].** Gollwitzer & Sheeran's meta-analysis of ~94 studies found
implementation intentions — a specific "when X, I do Y" — produced a
medium-to-large effect (d ≈ 0.65) over intention alone, by removing the decision at
the moment of action.

**How to solve it**

- **Shrink the first step until it is trivially doable and contains no decision.**
  *Side project:* the commitment is not "work on the app". It is "open the repo and
  write the function signature" — signature only, nothing else. A step that small
  cannot be argued with, and almost nobody stops there.

- **Set a floor rather than a target, so stopping early is permitted up front.**
  *Running:* the deal is "shoes on, to the end of the street, and if I want to stop
  there I stop." Paying for the exit in advance is what makes the start possible;
  most days it continues well past the street.

### 5. Change format every few minutes

**What happens.** Repeating the same input shape produces habituation — the signal
stops driving a response even though it is still arriving. Novelty is a genuine
driver of dopaminergic activity, so varying the form is a supply of the thing
attention runs on, not decoration. A bored learner will go and find stimulation
somewhere else.

**Evidence [moderate-strong].** Zentall's optimal stimulation theory holds that ADHD
behaviour is partly a search for stimulation under low-stimulation conditions.
Bunzeck & Düzel (2006) showed novel stimuli activate the substantia nigra/VTA — the
same dopaminergic region implicated in ADHD reward signalling (Volkow 2009).

**How to solve it**

- **Move the same idea through different channels.**
  *Kubernetes Services:* read the definition, draw the label-selector arrow by hand,
  break it in a terminal, then say out loud why the traffic stopped. One concept,
  four channels, ten minutes — and each switch restarts attention.

- **Change the mental demand even when the content stays identical.**
  *French verbs:* recognise the right form in a given sentence, then produce it in a
  sentence you invent, then judge whether someone else's sentence is correct. The
  verb set never changes; the task does, and that is enough.

### 6. Give feedback quickly

**What happens.** Feedback works by attaching to the memory of the action that
produced it. As the gap grows, that link weakens and the learner has to rebuild what
they did before the correction means anything. Where reward sensitivity is
time-dependent, delay flattens the reinforcement almost completely.

**Evidence [moderate].** Luman's review finds ADHD performance is unusually sensitive
to reinforcement timing. Honest caveat: in neurotypical lab studies, *delayed*
feedback sometimes beats immediate for complex material (Kulik & Kulik 1988), so this
holds for practice and reps rather than for essay-length work.

**How to solve it**

- **Close the loop while the attempt is still live.**
  *Maths practice:* check each answer as you finish that question, not from a sheet
  returned next week. By next week the learner cannot reconstruct why they took that
  step, so the correction has nothing to attach itself to.

- **Prefer tasks whose correctness is visible without a marker.**
  *Cooking — mayonnaise:* the emulsion holds or splits in front of you. Nobody has to
  tell you that you poured the oil too fast, and no feedback delay is possible.

### 7. Let them move around the subject freely

**What happens.** A curriculum's order comes from the subject's logical structure.
Attention is allocated by the learner's current interest. When those diverge,
enforcing the order means teaching someone who is not attending. The prerequisite
worry is usually overstated — most missing background can be supplied in a sentence
at the moment it is needed.

**Evidence [moderate].** Patall's meta-analysis (2008) found that providing choice
raises intrinsic motivation and effort. For ADHD, interest is what recruits attention
at all, so an order imposed against it costs more than the missing prerequisite does.

**How to solve it**

- **Supply missing background inline, in the smallest amount that unblocks them.**
  *Inflation:* a learner who jumps straight to "why did the Fed raise rates in 1979"
  does not need a monetary-theory course first. One sentence — "the policy rate is
  what banks pay to borrow overnight, and it drags every other rate with it" — is
  enough to carry on, and the theory lands later where it does real work.

- **Read where the learner wanders as evidence of their real goal, and rebuild the
  path around it.**
  *Robotics:* someone who keeps opening computer-vision material and skipping
  actuators is telling you they want a perception project. Re-plan towards that
  rather than steering them back to motors they may never need.

### 8. Keep hands and mouth busy

**What happens.** Passive intake produces nothing to check understanding against, so
it is easy to sustain the feeling of following while retaining none of it. Producing
something forces retrieval. For ADHD there is a second effect: movement appears to
raise arousal to the level where cognitive work is easier, which means restlessness
during hard tasks may be compensating rather than interfering.

**Evidence [moderate-strong].** Sarver & Rapport (2015) found that in children with
ADHD, *more* gross motor activity predicted *better* working memory performance. The
generation effect (Slamecka & Graf 1978) shows self-produced answers are remembered
much better than read ones.

**How to solve it**

- **Do the thing rather than watch the thing done.**
  *SQL:* type the query yourself with the tutorial closed, then open it to compare.
  Following along keystroke by keystroke produces the feeling of competence and none
  of the competence.

- **Design for movement instead of demanding stillness.**
  *Vocabulary:* run it as audio while walking, rather than seated at a desk. Pacing,
  standing and fidgeting should be treated as permitted study conditions — the
  evidence suggests they may be helping, not leaking.

### 9. Keep everything needed in view

**What happens.** Working memory is a small, volatile buffer. Anything the learner
has to hold — a rule, a value, a goal — takes capacity that is then unavailable for
understanding. This is a load problem, not a motivation problem, and trying harder
does not add capacity.

**Evidence [strong].** ADHD working memory deficits are well established (Martinussen
2005; Kasper 2012). The split-attention effect (Chandler & Sweller 1992) shows that
forcing learners to integrate separated sources reduces learning independently of
content. Barkley's model treats externalising information as the primary
compensation for executive-function deficits.

**How to solve it**

- **Put things that must be used together into a single visual field.**
  *Ohm's law:* the circuit diagram, the formula and the working all on one sheet,
  positioned so the eye moves between them without turning anything. Diagram on one
  page and formula three pages back turns a simple problem into a memory exercise.

- **Keep the current question written where the work is happening.**
  *Multi-step arithmetic or algebra:* the question stays at the top of the working,
  so a learner four steps deep never has to recall what they were solving for. Losing
  the goal mid-problem is the most common cause of a right method and a wrong answer.

### 10. Add mild urgency

**What happens.** Performance depends on arousal, and a slow, low-pressure task
leaves arousal below the level needed for engagement. A modest deadline or quicker
tempo pulls it up. This is the mechanism behind working well the night before a
deadline: the urgency is doing real neurochemical work.

**Evidence [strong].** Sergeant's cognitive-energetic model predicts performance
depends on event rate, and studies consistently find slow event rates hurt ADHD
groups disproportionately while faster rates narrow the gap with controls.

**How to solve it**

- **Raise the event rate — more items, shorter, in quicker succession.**
  *Anatomy:* twenty bones in two minutes with instant reveal beats the same twenty
  over fifteen minutes with commentary between each. The content is identical; the
  density is what changes engagement.

- **Use a real person waiting rather than an artificial countdown.**
  *Any subject:* book a twenty-minute call on Thursday to explain the week's material
  to someone. A human expecting you does what no timer does, because the consequence
  is real and social rather than symbolic.

### 11. Protect hyperfocus

**What happens.** Deep absorption is unusually valuable here and unusually fragile.
Entering it is unreliable, being knocked out is easy, and re-entering the same day may
be impossible. Standard advice — fixed breaks, timed work cycles — assumes focus can
be summoned on demand, and that is exactly the assumption that does not hold.

**Evidence [moderate].** Hyperfocus is documented and measured in ADHD (Hupfeld 2019;
Ashinoff & Abu-Akel 2021) as intense, sustained absorption in a high-interest task.
The literature is young, but the practical implication is consistent.

**How to solve it**

- **Do not interrupt a productive run for a scheduled break; break when the run ends.**
  *Learning a codebase:* if the debugging is going well at the 25-minute mark, ignore
  the timer. Rebuilding a half-formed mental model of a call stack costs more than the
  break was ever going to return.

- **Put boundaries only on what absorption endangers, never on the work itself.**
  *Robotics build:* set an alarm for the 6pm meeting and for dinner. Do not set one
  for "stop soldering" — that is the part that was going well.

### 12. Make stopping safe

**What happens.** Resuming an interrupted task means rebuilding the goal state: what
you were doing, why, and where you had got to. That reconstruction is executive work,
and when it is expensive the task is quietly abandoned rather than resumed. The
anticipation of that cost also stops people beginning anything they cannot finish in
one sitting.

**Evidence [strong].** Altmann & Trafton's memory-for-goals model and Mark's
interruption studies (2008) show resumption carries a real reconstruction cost. For a
working-memory-limited learner, that reconstruction is the expensive part.

**How to solve it**

- **Stop mid-thought and write the next action down before leaving.**
  *Working through a proof:* stop with "next: substitute the boundary condition"
  written at the bottom, rather than at a tidy section end that leaves nothing to grab
  hold of tomorrow. A clean stopping point is the hardest kind to restart from.

- **Preserve partial work by default so stopping costs nothing.**
  *Kubernetes lab:* a half-configured cluster must still be there tomorrow. If the
  environment resets on exit, learners rationally stop attempting anything they cannot
  finish in one sitting — which is most of the useful exercises.

### 13. Show one thing at a time

**What happens.** Everything present competes for selection, and filtering is the weak
function. Extra material is not neutral — even when relevant, it consumes selection
effort and can crowd out the main line.

**Evidence [strong].** Mayer's coherence principle: removing
interesting-but-unnecessary material improves learning, across many replications.

**How to solve it**

- **One idea per view, even when two ideas are usually taught as a pair.**
  *Inflation:* demand-pull and cost-push are two separate units, not two halves of one
  page. Presented together, most learners come away with a blur — "prices go up for
  various reasons" — and can no longer tell which policy responds to which.

- **Announce the seam between ideas instead of merging them.**
  *Anatomy:* "That is the whole shoulder joint. Next: why it dislocates more than any
  other joint in the body." A stated boundary gives the learner a moment to bank the
  first idea before the second one starts loading.

### 14. Ask before explaining

**What happens.** An attempt made before the explanation changes what the explanation
does. It creates a specific gap, activates related knowledge, and produces a
prediction the explanation either confirms or corrects. Failing the attempt is fine
and may be the point — the error marks the spot the correction should land on.

**Evidence [strong].** Pretesting works: Richland (2009) and Kornell (2009) found that
attempting an answer and failing before being taught produces better retention than
studying for the same time.

**How to solve it**

- **Extract a commitment before every reveal — a guess, a number, a drawn line.**
  *Inflation:* "Draw where you think US inflation went between 1979 and 1983." Then
  show the actual series over their line. They will remember their own wrong curve
  and the shape of the correction for years.

- **Never score the guess, and make the reveal name the gap directly.**
  *PID control:* "You expected tripling the gain to settle it faster. It overshoots
  and rings — the piece your model left out is momentum." Not "incorrect, the answer
  is D." Scored guesses stop being honest guesses, and the mechanism dies.

### 15. Use surprise and story

**What happens.** Memory is not uniform. Events that violate expectation or carry
emotional charge are encoded more strongly; neutral facts carry no such tag. Stories
add a second advantage: causal links make each element retrievable from the others.

**Evidence [strong].** Dopamine neurons fire to *prediction error* — the gap between
expectation and outcome — rather than to reward itself (Schultz 1997). Emotional
arousal at encoding improves later recall (Cahill & McGaugh 1995).

**How to solve it**

- **Build the explanation around a contradiction of the obvious answer.**
  *Robotics:* "more sensors give a better estimate" is what everyone assumes and it is
  false — a sensor with the wrong assumed error makes the estimate worse. Teach fusion
  starting from that collision, not from a definition of a Kalman filter.

- **Order material as a causal chain rather than as a taxonomy.**
  *Volcker:* "inflation at 12%, two failed attempts, a new chair, rates to 20%,
  unemployment to 10.8%, inflation broken for forty years" is retrievable end to end,
  because each link implies the next. "The four causes of disinflation" is a list, and
  lists decay.

### 16. Reduce the number of decisions

**What happens.** Every choice point is a decision, and decisions are executive work.
When initiation is already expensive, a menu is where the session stops — the learner
defers rather than chooses badly. There is a genuine tension, because choice also
raises motivation. The resolution: choice should be *available but never required*.

**Evidence [contested — read the caveat].** Iyengar & Lepper (2000) famously found
shoppers bought jam ten times more often from a display of 6 than of 24. But
Scheibehenne's meta-analysis (2010) found the average choice-overload effect is close
to zero and highly conditional. What survives is narrower and sufficient: more options
mean more decision time and more deferral.

**How to solve it**

- **Offer one strong default so choosing is optional, not the price of starting.**
  *Any course:* "Continue: sensor fusion, 4 minutes" as the single primary action,
  with the full map one click behind it. A learner who opens to a grid of thirty
  equally weighted tiles frequently picks none of them and closes the tab.

- **Separate deciding from doing, so nothing is chosen at the moment of action.**
  *Weekly study:* pick Sunday which four topics get done this week. On Tuesday evening
  there is no question to answer — only a page to open. The decision was made when
  capacity was high and spent when it is low.

### 17. Err on the side of too fast

**What happens.** Boredom and confusion have very different recovery profiles. A
confused learner slows down, re-reads or asks. A disengaged learner leaves and does
not come back. That asymmetry means the safer error is slightly too fast.

**Evidence [moderate].** Sustained attention deficits in ADHD are well established
(Huang-Pollock 2012), and performance degrades with time on task. Zentall's work
indicates under-stimulation drives off-task behaviour.

**How to solve it**

- **Pitch above comfort and put the depth on demand.**
  *Kubernetes:* write for someone who knows Linux, and make every term hoverable for
  anyone who does not. Writing for the least-prepared reader holds everybody at the
  slowest possible pace and loses the rest.

- **Delete recaps and transitions; they lose a bored learner before the content does.**
  *Any second session:* no three minutes of "last time we covered…". One line, or
  nothing at all — the people who needed the recap can re-open the previous unit.

### 18. Let them skip what they already know

**What happens.** Practising a mastered skill produces near-zero learning at a real
cost in engagement. For an ADHD learner the damage goes further than wasted time:
being made to sit through known material teaches that this source is not worth
attending closely, and that lesson generalises to the parts that mattered.

**Evidence [moderate].** Cen (2007), using Cognitive Tutor data, showed students
substantially over-practise mastered skills and that removing the over-practice saves
large amounts of time with no loss of learning.

**How to solve it**

- **Diagnose before instructing, and teach only the gap.**
  *Kubernetes:* one question — "do you use Docker daily?" — removes six units for half
  of all learners. Two or three such questions can cut a course by a third before it
  starts.

- **Make "I already know this" a right that is honoured without proof.**
  *French:* someone who lived in Lyon skips greetings and numbers without sitting a
  placement test. If the claim was wrong, review will surface it in a week at far
  lower cost than making everyone prove themselves up front.

### 19. Make progress concrete

**What happens.** A percentage is an abstraction over a total the learner has no feel
for, and abstractions do not motivate. A statement of new capability is concrete,
checkable, and is the actual thing they came for.

**Evidence [strong].** Locke & Latham's goal-setting theory: specific, concrete goals
consistently outperform vague ones. Kivetz (2006) showed effort accelerates as a
visible endpoint nears.

**How to solve it**

- **Express progress as things the learner can now do.**
  *Kubernetes:* "You can now read a manifest and find why a rollout is stuck" beats
  "Module 4 of 9 complete", because the first one is checkable and is the reason they
  came.

- **Move the indicator only on a demonstrated act, never on consumption.**
  *Any course:* the counter advances when a problem is solved, never when a page is
  scrolled to the bottom. A number that moves for reading teaches the learner that the
  number means nothing.

### 20. Make coming back after a gap painless

**What happens.** A lapse against a standard triggers a response out of proportion to
the lapse: the goal is judged already failed, so continued effort feels pointless and
the whole thing gets dropped. Where emotional regulation is harder, that moment
arrives faster and hits harder.

**Evidence [moderate].** The what-the-hell effect (Cochran & Tesser 1996) and the
abstinence-violation effect from relapse research describe the same pattern. Emotion
dysregulation is present in a large share of adults with ADHD (Shaw 2014).

**How to solve it**

- **On return, offer a short reload of context instead of the backlog that accrued.**
  *Any topic after three weeks away:* open with "three things worth reloading", then
  straight into one short unit. A queue of 200 overdue review items is a wall, and
  people do not climb walls — they close the tab.

- **Keep consistency and achievement as separate things, so a lapse erases neither.**
  *French:* two missed weeks must not reset vocabulary levels. What was learned is
  still learned; only the review schedule needs to shift, and it should shift quietly.

---

## 20 things that do not work

### 1. Long unbroken text

**What happens.** Reading a long block means continuously re-selecting the text over
intrusive thoughts. Mind-wandering rises with time on task while comprehension falls,
and the characteristic failure is that the eyes keep moving with nothing going in —
often unnoticed until pages later.

**Evidence [strong].** Mind-wandering increases with time on a text and predicts worse
comprehension (Smallwood & Schooler 2006). Bozhilova's review (2018) finds
spontaneous mind-wandering is elevated in ADHD and tracks symptom severity.

**How to solve it**

- **Give prose landmarks so a drifting reader can rejoin without restarting.**
  *An inflation chapter:* headings every few paragraphs, the CPI figures pulled into a
  table, the causal chain drawn as a diagram. Someone who surfaces after two lost
  minutes finds their place instead of re-reading the whole page and giving up.

- **Convert dense reasoning into a worked example with numbers.**
  *Bayes' theorem:* three paragraphs of conditional-probability prose becomes "1,000
  people, 10 have the disease, the test catches 9 of them and also flags 99 healthy
  people". Identical content, in a form that survives a wandering mind.

### 2. Payoff only at the end

**What happens.** A distant reward is heavily discounted and does not compete with a
small immediate alternative. "This will all make sense at the end" is not motivating
however true it is. The stretch of unrewarded effort before the payoff is exactly
where people stop.

**Evidence [strong].** ADHD shows steeper delay discounting across many studies
(Marx 2021 meta-analysis).

**How to solve it**

- **Make every segment produce something usable on its own.**
  *Git:* after the first fifteen minutes the learner can commit and undo — genuinely
  useful by itself. Three hours of branching theory before anything works is the
  version that gets abandoned at minute forty.

- **Shorten the gap between effort and visible result, even artificially.**
  *French:* frame the first forty words as "enough to order lunch", and have them do
  exactly that on day one — a real transaction, not at the end of the course.

### 3. Tasks with no defined finish

**What happens.** An ambiguous task makes the learner define the task themselves,
which is planning work stacked on learning work. "Review this chapter" has no
completion test, so there is no way to know when you are done and no way to judge
whether starting is worth it.

**Evidence [strong].** Goal-setting research consistently finds vague goals ("do your
best") produce worse performance than specific ones (Locke & Latham).

**How to solve it**

- **Give every task a completion test: name what will exist when it is done.**
  *Kubernetes:* replace "read about Services" with "write a Service manifest that
  routes to this pod, and prove it with one curl". Now being finished is a fact, not a
  feeling.

- **Where the task is genuinely open-ended, impose an arbitrary boundary.**
  *Reading into a new research area:* "three papers" or "one page of notes" — not "get
  familiar with the literature", which has no end and therefore no beginning.

### 4. Locked steps and enforced sequence

**What happens.** A gate turns a moment of live interest into a chore. Someone who
wants to know how one thing works is handed four unrelated units first, and the
interest — which was the entire resource — is spent before the answer arrives.

**Evidence [moderate].** Choice supports intrinsic motivation (Patall 2008), and
enforced sequence works directly against the interest doing the attentional work.

**How to solve it**

- **Let any point be an entry point, especially the urgent one.**
  *Kubernetes:* someone whose cluster is broken right now should be able to open "why
  is my pod Pending" directly and get a real answer. A live problem is the strongest
  motivation that will ever exist for this learner, and a gate spends it.

- **Offer the same material at several depths, so "not ready" gets a shorter version
  rather than a redirect.**
  *Inflation:* the transmission mechanism available as one paragraph, one page, or in
  full. The under-prepared learner is served in place instead of being sent away to
  come back never.

### 5. Warm-ups, preambles and objectives

**What happens.** Attention is highest at the start and declines from there. Spending
that peak on history, aims and housekeeping means the real content arrives when
capacity has already dropped. A preamble also delays the moment the learner can tell
whether this is even the thing they wanted.

**Evidence [inference, from a strong base].** No study measures preambles directly.
But sustained attention declines with time on task (Huang-Pollock 2012) and curiosity
must be established to get its memory benefit (Gruber 2014), so the opening minutes
are the most valuable and the most easily wasted.

**How to solve it**

- **Start on the substance and let context arrive when it is needed.**
  *French:* open with a sentence they will use today. Not the history of the language,
  not how the course is organised, not what they will be able to do in six weeks.

- **Apply the skip test: if a knowledgeable person would skip it, cut it entirely.**
  *Any recording or chapter:* "Hi, welcome back, in this section we'll be covering…"
  fails the test. Delete the first ninety seconds and start where the content starts.

### 6. Long video

**What happens.** Video imposes the author's pace. You cannot skim it, scanning back
is clumsy, and there is no natural checkpoint to notice you have stopped taking
anything in. It also produces an unusually strong illusion of learning.

**Evidence [strong].** Guo (2014) found engagement drops sharply past ~6 minutes.
Szpunar (2013, PNAS) found inserting short tests into a lecture segment roughly
halved self-reported mind-wandering and improved final test performance.

**How to solve it**

- **Use video only where motion carries the information, and put everything else in
  text so pace returns to the learner.**
  *Guitar:* a strumming hand is worth filming — the timing cannot be written down. The
  theory behind the progression should be text the learner can scan in twenty seconds
  rather than wait four minutes for.

- **Interrupt any longer recording with questions.**
  *A recorded Kubernetes lecture:* a question roughly every ninety seconds — "what
  happens to that pod now?" — measurably outperforms the same lecture run straight
  through. This is a tested fix, not a guess.

### 7. Note-taking as the main activity

**What happens.** Transcribing and understanding compete for the same resources. Notes
taken while trying to follow tend to be verbatim and shallow — the effort feels
productive but is closer to copying than to processing. And most such notes are never
opened again.

**Evidence [moderate].** Piolat (2005) shows note-taking imposes high cognitive load
that competes with comprehension. Honest caveat: the well-known
longhand-beats-laptop result (Mueller & Oppenheimer 2014) failed to replicate at scale
(Morehead 2019), so do not over-claim the handwriting part.

**How to solve it**

- **Supply the record from elsewhere so the learner's effort goes into retrieval.**
  *A lecture:* hand out the slides and transcript up front, and ask for three
  sentences from memory at the end. Those three sentences do more than four pages of
  transcription, and cost a fraction of the attention.

- **Mark and question during input; write with the source closed afterwards.**
  *A textbook chapter:* underline and put "?" in the margin while reading, then shut
  the book and write the summary. Notes written with the book open are copying; the
  same notes with it shut are retrieval practice.

### 8. Relying on the learner to come back

**What happens.** Remembering to do something at a future moment is a specific
weakness, distinct from motivation. The intention is genuine; it simply fails to
surface when it is needed. Systems that depend on it fail silently, because nobody
reports the sessions that never occurred to them.

**Evidence [strong].** Prospective memory is reliably impaired in ADHD (Talbot &
Kerns 2014, and meta-analytic reviews since).

**How to solve it**

- **Put the reminder in the environment rather than in the learner's intentions.**
  *Anything weekly:* a calendar entry with an alarm, or a friend who expects a message
  on Thursday. "I'll get back to it" is a feeling, not a mechanism, and it reliably
  loses to a busy week.

- **Make the cue name the action, not the goal.**
  *French:* "do the eight listening items" survives a tired evening. "Keep up with
  French" does not, because it still needs a decision made at the worst possible
  moment.

### 9. Streaks and daily guilt

**What happens.** Streaks work through loss aversion, which requires the streak to be
losable — so the mechanic is strongest immediately before it destroys itself. It also
moves motivation from the material to the counter, and when the counter goes the
reason to continue goes with it.

**Evidence [moderate].** Deci's meta-analysis of 128 studies found tangible,
performance-contingent rewards reliably undermine intrinsic motivation. Combined with
the what-the-hell effect, a streak first replaces interest with obligation and then
punishes a single miss. Honest note: I know of no direct trial of streak mechanics in
ADHD populations — this is two strong findings pointed at one feature.

**How to solve it**

- **Count cumulatively, so a gap subtracts nothing.**
  *Any app:* "47 sessions since March" is true, unbreakable, and still rewarding after
  a fortnight away. "12-day streak" is a countdown to the day the learner leaves.

- **Write the recovery step before any miss happens.**
  *A study plan:* "missing one session is expected. Missing two means the step is too
  big — halve it." Agreed in advance, a lapse arrives with an obvious next move
  instead of a verdict.

### 10. Dead time

**What happens.** An unfilled gap is an invitation to switch away, and switching away
is far easier than switching back. The cost is not the seconds — it is the session,
because the return trip has to pay the full resumption cost.

**Evidence [moderate].** Nielsen's response-time limits are the standard: about one
second keeps thought uninterrupted; about ten seconds is the limit of attention on a
task.

**How to solve it**

- **Take the waiting out of the work itself.**
  *Robotics simulation:* if the model takes forty seconds to rebuild after each
  parameter change, nobody explores parameters — and exploring parameters is where the
  intuition comes from. Getting that to two seconds changes what is learned, not just
  how fast.

- **Fill unavoidable waits with something related rather than with nothing.**
  *A long compile or training run:* that gap is the natural home for two review
  questions. Left blank, it is where the learner opens another tab and the session
  ends.

### 11. Several instructions at once

**What happens.** A multi-step instruction must be held in working memory while step
one is carried out. Capacity is exceeded and everything after the first clause is
lost. From outside this looks like not listening; it is a buffer overflow, and
repeating it louder does not add capacity.

**Evidence [strong].** Following multi-step spoken instructions is a well-studied
working-memory task, and performance tracks working-memory span closely (Gathercole
2008) — precisely the capacity reduced in ADHD.

**How to solve it**

- **One step, wait for it to be done, then the next.**
  *A Kubernetes lab:* "Run `kubectl get pods`." — wait — "Now delete web-z." Not "get
  the pods, delete web-z, describe the replicaset and tell me what changed", which
  reliably produces step one and a blank look.

- **Let the learner tick off a written sequence so it lives outside their head.**
  *First aid:* a printed card for the primary survey that gets checked off in order.
  The one occasion it is needed is the worst possible moment to be holding five steps
  in memory.

### 12. Rules that must be carried across pages

**What happens.** When a rule appears on page two and is needed on page five, the
learner either flips back — losing the thread — or reconstructs from memory, losing
accuracy. Either way effort goes into logistics, and the resulting difficulty is
mistaken for the material being hard.

**Evidence [strong].** The split-attention effect (Chandler & Sweller 1992):
information that must be used together but is presented apart imposes load and
measurably reduces learning.

**How to solve it**

- **Repeat essentials at the point of use instead of cross-referencing them.**
  *A statistics workbook:* print the formula on the same page as every exercise that
  needs it. Reprinting it twelve times costs twelve lines; sending the reader back
  twelve times costs the thread each time.

- **Where a reference is unavoidable, make it permanently visible rather than
  navigable.**
  *French conjugation:* a wall chart above the desk, not an appendix at the back of
  the book. The chart is glanced at; the appendix is a trip.

### 13. Cluttered material and environments

**What happens.** Filtering irrelevant stimuli is the weak function, so a busy field
imposes a continuous tax that never shows up as a discrete problem. Attractive
irrelevant material is worst, because it wins the competition against the main line —
which is why "making it more engaging" by adding things often backfires.

**Evidence [strong].** The coherence and seductive-details literature (Mayer;
Rey 2012 meta-analysis) shows added interesting-but-irrelevant material lowers
comprehension.

**How to solve it**

- **Cut the entertaining tangent first, because it is the part that wins.**
  *An inflation chapter:* the Weimar wheelbarrow anecdote dropped into the middle of
  the monetary-transmission explanation is the most memorable thing on the page, and
  that is the problem — learners retain the wheelbarrow and lose the mechanism. Give
  it its own unit.

- **Set the physical environment before starting rather than resisting it during.**
  *Evening study:* phone in another room, one tab open, door shut — decided in
  advance. Willpower spent on not checking messages is willpower not available for
  the material.

### 14. Setup before starting

**What happens.** The motivation to begin arrives in bursts and does not keep. Any
required preliminary spends that burst, and the work never starts. Worse,
preliminaries feel productive, so they make excellent substitutes for the work and
can absorb a whole session unnoticed.

**Evidence [inference, from a strong base].** Task initiation is the documented
bottleneck in ADHD executive function, and each added pre-step is another initiation
cost paid before any reward arrives.

**How to solve it**

- **Keep the setup permanently ready so starting costs nothing.**
  *Guitar:* on a stand in the living room, not in a case under the bed. The case is
  the single most common reason people stop playing, and it is a ten-second obstacle.

- **Do the preparation at a different time from the work.**
  *Study session:* download the papers, charge the laptop and clear the desk on
  Sunday. Then Tuesday's willingness gets spent on the material rather than on
  logistics that will exhaust it first.

### 15. Repeating what they already know

**What happens.** No learning, real cost. Beyond wasted time, boredom here is an exit
rather than an inefficiency, and it trains loose attention toward this source — which
then damages the material that actually needed it.

**Evidence [moderate].** Over-practice of mastered skills is measurable and wasteful
(Cen 2007). Under-stimulation drives off-task behaviour (Zentall).

**How to solve it**

- **Vary the challenge rather than the repetition: use the known idea in an unfamiliar
  context.**
  *Times tables:* a child who knows them cold should not get another grid. Give them
  "how many tiles for this floor?", where the tables are one step inside a problem
  they have not seen.

- **Stop the worked examples once the pattern is reliable and hand over the problem.**
  *Algebra:* after two worked examples of the same form, a third is watched rather
  than learned. The third one should be theirs to attempt, wrong answer included.

### 16. Vague progress numbers

**What happens.** A percentage of a total the learner cannot see is noise. It does not
tell them whether to continue, and it cannot produce the end-of-goal acceleration
because there is no credible end in view.

**Evidence [strong].** Goal specificity drives performance (Locke & Latham), and the
goal-gradient effect needs a legible endpoint to work against (Kivetz 2006).

**How to solve it**

- **Make the whole finite and visible from the outset.**
  *French:* "the 30 verbs that cover most spoken French" is a total you can believe in
  and see the end of, so verb 22 feels close to done. "Level 4 of ?" produces no such
  pull.

- **Measure in units the learner recognises from the real world.**
  *Kubernetes:* "6 of the 8 failure modes you will actually meet in production" is a
  denominator with meaning. "62% of Chapter 3" is a fact about the book, not about
  them.

### 17. Harsh marking

**What happens.** Feedback aimed at the person rather than the work redirects
attention from the task to self-evaluation, which reliably damages performance. Where
emotional responses are stronger and slower to settle, that can end the session and
colour the decision about returning. The information is usually fine; the framing does
the damage.

**Evidence [strong].** Kluger & DeNisi's meta-analysis of over 600 effect sizes found
roughly a third of feedback interventions *reduced* performance, with self-directed
feedback the main culprit. Emotion dysregulation affects a large share of adults with
ADHD (Shaw 2014).

**How to solve it**

- **Make every correction specific and attached to an immediate next attempt.**
  *French:* "'Je suis allé' takes être, not avoir — now try the same sentence with
  'venir'." Not "3/10". The first is usable in the next four seconds; the second is
  only a verdict.

- **Keep practice unscored, because practice that is graded stops being practice.**
  *Chess:* reviewing your own losses is practice only while nobody is rating the
  session. Mix assessment into it and learners stop trying the uncertain moves — which
  are the only ones with anything to teach.

### 18. Assuming today will match yesterday

**What happens.** Variability is intrinsic, not fading commitment. A system tuned to
yesterday's capacity is wrong on most days — too hard on bad ones, too easy on good
ones. Reading a bad day as backsliding prompts exactly the wrong response: more
pressure on a day when capacity is already low.

**Evidence [strong].** Elevated intra-individual variability is among the most
replicated findings in ADHD (Kofler 2013 meta-analysis).

**How to solve it**

- **Set a low floor and leave the ceiling open.**
  *Daily study:* the commitment is one review card; good days run to an hour and are
  not stopped. A fixed thirty-minute daily target fails at both ends — impossible on
  the bad days, an artificial brake on the good ones.

- **Judge by cumulative output over weeks, not by day-to-day consistency.**
  *Language learning:* four intense days and three blank ones is a good week. A
  system that flags the three blank days is measuring regularity, which is not the
  thing anyone wanted.

### 19. Timing the thinking

**What happens.** Time pressure consumes working memory with monitoring and worry —
the exact resource comprehension needs. This is not a contradiction of "add urgency":
urgency motivates *starting*, while a clock on *thinking* blocks it. The distinction
is what is being timed.

**Evidence [strong].** Beilock & Carr (2005) showed pressure causes choking on
working-memory-dependent tasks, hitting high-working-memory strategies hardest.

**How to solve it**

- **Time only the things where speed is part of the skill.**
  *French:* time the recall of a word, because retrieval speed is what fluency
  actually is. Never time working out *why* the imparfait is correct in this sentence
  — that is reasoning, and the clock removes the capacity it needs.

- **Bound the session rather than the individual thought.**
  *A maths problem set:* "forty-five minutes on this sheet" is fine and even helpful.
  "Ninety seconds per question" causes blanking on precisely the questions that
  required thinking.

### 20. "Just focus" and effort framing

**What happens.** Telling someone to focus asks them to solve, through effort, a
problem in the mechanism that regulates effort. It also implies the difficulty is a
character flaw, which adds shame to a task already being avoided. And it contains no
information about what to do differently.

**Evidence [moderate-strong].** ADHD has measurable neurobiological correlates,
including reduced dopamine reward-pathway markers in adults (Volkow 2009, JAMA).
Effort-blaming feedback is also self-directed feedback — the category Kluger & DeNisi
identified as most likely to hurt performance.

**How to solve it**

- **Change a condition instead of issuing an instruction.**
  *A stalled side project:* if nothing happens at the desk at 9pm, try twenty minutes
  in a café at 8am. That is a testable change with a result you can read next week;
  "be more disciplined" is not testable and produces nothing.

- **Read a repeated stall as a fault in the task's design.**
  *A learner who abandons the same topic three times:* that unit is almost certainly
  too big, too abstract, or missing a prerequisite. Rebuild it smaller and more
  concrete rather than asking for more effort against the same wall.

---

## What this means for our product

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
Nielsen (1993), *Usability Engineering* — response time limits.
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

*This is guidance drawn from published research on attention, memory and ADHD. It is
not clinical or diagnostic advice. Where a point is tagged [inference], no study tests
that choice directly.*
