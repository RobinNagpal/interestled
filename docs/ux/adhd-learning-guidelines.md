# ADHD Learning Guidelines

Why ADHD learners disengage, what the research says, and exactly how to fix it.
Companion to [README.md](./README.md).

The single most useful thing to know about ADHD is that it does not mean having less
attention. It means attention gets allocated differently: it goes to whatever is
**interesting, novel, urgent or difficult**, and largely ignores whatever is merely
important. So a learner can lose an afternoon to something they picked up by accident
and be unable to start the thing they actually care about. Nothing below is about
making people try harder. It is about arranging material so that the attention they
do have can reach it.

Four traits are behind almost every point in this document:

- **Weak working memory.** Deficits are moderate to large, and largest in spatial
  working memory (Martinussen 2005; Kasper 2012). Anything held in the head is
  expensive, so anything you make them hold is taken from the thinking.
- **Time blindness.** Estimating and reproducing durations is reliably impaired
  (Toplak 2006). A task with no stated length does not feel long — it feels endless.
- **Delay aversion.** A smaller reward now beats a bigger one later, more steeply
  than usual (Sonuga-Barke 1992; Marx 2021). A payoff next week is not a payoff.
- **Inconsistent performance.** The most robust lab finding is not slowness but
  *variance* — reaction times swing far more, trial to trial and day to day
  (Kofler 2013). A bad day is noise, not a trend.

Most of what follows helps everyone. It is only *essential* for ADHD learners, which
is why so much of it looks like ordinary good teaching pushed one step further.

**Each point has three parts:** what actually happens, the evidence for it, and two
ways to solve it — each with a worked example showing exactly how the learning gets
structured. The solutions are medium-independent, so they work in a book, a class, a
tutorial or an app; what our own product does about them is collected in one short
section [at the end](#what-this-means-for-our-product). Every solution appears exactly
once, and where two points look similar they are fixing different mechanisms — the
examples show the difference.

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

**What happens.** Someone tells you a topic is important, you agree with them, and you
still don't read it. That happens because attention isn't handed out by importance —
it's pulled by a gap, the feeling that something in front of you doesn't add up. An
argument about why a subject matters creates no such gap, so there is nothing to do the
pulling. Showing someone a thing they cannot explain does create one, and in ADHD that
route is carrying almost the whole load, because the importance route is weaker to begin
with.

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

**What happens.** Give someone forty unbroken minutes of good material and they will
drift somewhere in the middle. The length is not really the problem; the missing edges
are. With no ending, nothing can ever be marked as done — and until mastery arrives,
finishing is the only reward on offer. Take it away and there is nothing left to work
toward. Edges also hand you the natural places to check whether anything went in.

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

**What happens.** Before starting anything you make a rough cost-benefit call, and the
cost side of it is "how long will this take?". If you cannot estimate duration — and
that estimate is one of the reliable ADHD deficits — the answer comes back "unknown",
which the mind rounds up to "forever". So the task gets deferred, not because it is hard
but because it has no visible edge. The same blindness runs through the task itself:
with no feel for time passing, there is no sense of nearing the end and no lift from
being close to it.

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

**What happens.** Starting and continuing are different problems, and starting is the
hard one. Continuing only means not stopping; starting means producing an action out of
nothing. That is why a first step like "work out what to do first" fails — it hides a
decision inside the step, which is exactly the cost you were trying to skip. A physical
first move works better because it recruits the motor system instead of the intention.

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

**What happens.** Read three screens in the same format and the third one stops
registering, even though you are still looking at it. That is habituation: the signal
keeps arriving and stops producing a response. Novelty genuinely drives dopamine
activity, so changing the shape of the material is a refill of the thing attention runs
on rather than decoration. And when it runs dry, boredom is not neutral — the learner
goes and finds stimulation somewhere else.

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

**What happens.** Feedback works by attaching to the memory of what you just did. Leave
it a week and that memory is gone, so the correction arrives with nothing to attach to
and the learner has to rebuild what they were thinking before it means anything. Where
reward sensitivity is itself time-dependent, delay does not merely weaken the feedback —
it flattens it.

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

**What happens.** A curriculum's order comes from the structure of the subject;
attention comes from the learner's current interest. Most of the time those point in
different directions, and when they do, enforcing the order means teaching someone who
is not listening. The usual defence of the order is prerequisites — but most missing
background turns out to be a single sentence, deliverable at the moment it is needed
rather than four units earlier.

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

**What happens.** Reading something and understanding it feel identical from the inside,
which is what makes passive study so easy to sustain and so unproductive. Producing
something breaks the tie, because it forces retrieval and retrieval is what strengthens
memory. There is a second effect specific to ADHD: movement appears to raise arousal to
the level where thinking gets easier, so the fidgeting during hard tasks may be helping
rather than interfering.

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

**What happens.** Working memory is a small buffer that empties easily. Anything the
learner holds in it — a formula, a value, the question they are answering — occupies
space that is then unavailable for the actual thinking. When two things that must be
combined are presented apart, the effort goes into carrying them back and forth instead
of using them. None of this responds to trying harder, because effort does not add
capacity.

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

**What happens.** There is a familiar pattern where nothing happens for three weeks and
then the whole essay gets written the night before it is due. That is not simply
concentration under threat. Arousal has to reach a certain level before engagement is
possible, and a slow, pressure-free task leaves it below the line; a modest deadline or
a quicker tempo raises it. The urgency is doing real work, which is why removing all
pressure often removes all output.

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

**What happens.** Getting into deep absorption is unreliable, being knocked out of it is
easy, and getting back in the same day may not happen at all. That asymmetry is what
makes the standard advice wrong here — fixed breaks and timed cycles assume focus can be
summoned whenever the timer says so. When it cannot, interrupting a rare good run trades
something large for something small.

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

**What happens.** Picking a task back up means rebuilding where you were and why, and
that reconstruction is real executive work rather than a formality. When it costs
enough, the task does not get resumed; it gets quietly dropped. People also learn to
anticipate that cost, so they stop starting anything they cannot finish in one sitting —
which rules out most things worth doing.

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

**What happens.** Everything on the page competes to be selected, and selection is the
weak function. So extra material is never free, even when it is relevant: it draws
effort away from the main line. The part that surprises people is which extras cost the
most — the interesting ones, precisely because they win.

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

**What happens.** Being told an answer and discovering you do not know it produce very
different states. An attempt made first creates a specific gap, wakes up related
knowledge, and commits the learner to a prediction that the explanation can then confirm
or correct. Getting it wrong is fine, because the error marks exactly where the
correction should land. Told first, there is no gap and the explanation lands on
nothing.

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

**What happens.** You remember the surprising thing from a lecture and none of the
definitions, and that is not a failure of discipline. Memory is not uniform: events that
break an expectation or carry emotion get encoded more strongly, while neutral facts get
no such tag. Story adds a second effect on top, because when elements are linked by
cause, remembering one pulls the next one along with it.

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

**What happens.** A menu is where sessions end. Every option is a decision, decisions
are executive work, and when starting is already expensive the honest response to six
good choices is to pick none of them and close the tab. There is a real tension here,
because being offered some choice does raise motivation. The way out is that choice
should be available and never required.

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

**What happens.** Confusion and boredom look similar from outside and behave nothing
alike. A confused learner slows down, re-reads, or asks a question — they are still in
the room. A bored one leaves and does not come back. Since only one of those is
recoverable, the safer mistake is going slightly too fast.

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

**What happens.** Practising something you already know produces almost no learning,
which would only be wasteful if that were the whole cost. It is not. Sitting through
familiar material teaches the learner that this source does not need close attention,
and that lesson does not stay put — it carries straight into the parts that did matter.

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

**What happens.** "68% complete" is a fraction of a total you cannot see, so there is
nothing in it to act on. "You can now find why a rollout is stuck" is checkable, and it
is the thing the learner came for. Progress information has a second job as well —
effort rises as the end comes into view — but that only works if the end is real enough
to believe in.

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

**What happens.** One missed day should not matter, and yet it reliably ends things.
What happens is that the lapse gets read as failure of the whole goal, which makes the
remaining effort feel pointless. Where emotions run stronger and settle more slowly,
that judgement arrives faster and lands harder. So any system that punishes a miss tends
to lose people permanently over a single one.

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

**What happens.** You reach the bottom of a page and realise nothing has gone in since
the top. The eyes kept moving; selection did not. Mind-wandering climbs the longer you
stay on one block of text and comprehension falls with it, and the failure usually goes
unnoticed for a while. When spontaneous mind-wandering is elevated to begin with, that
window is far shorter than the page is long.

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

**What happens.** "It will all make sense at the end" is often true and almost never
motivating. A reward that distant gets discounted heavily, so it cannot compete with the
immediate alternative of doing something else. The unrewarded stretch before the payoff
is where people stop — and being nearly there makes no difference, because they cannot
feel how near they are.

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

**What happens.** "Review this chapter" has no test for being finished, so the learner
has to define the task before they can do it. That is planning work stacked on top of
learning work, arriving at the moment capacity is lowest. And with no picture of what
done looks like, there is no way to judge whether starting is worth it — so it does not
get started.

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

**What happens.** Someone wants to know how one specific thing works, and the system
hands them four unrelated units first. Their interest was the entire resource, and it
has now been spent on material they did not ask for. Gates also treat prerequisites as
all-or-nothing, when in practice a rough grasp is usually enough to go on with and gets
sharpened by use.

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

**What happens.** Attention is at its highest in the first minute and declines from
there. Spending that minute on history, aims and how the course is organised means the
real content arrives after capacity has already dropped. It costs something else too:
until the preamble ends, the learner cannot tell whether this is even the thing they
wanted — and that is exactly when most of them leave.

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

**What happens.** Video runs at the author's pace rather than yours. You cannot skim it,
going back is clumsy, and there is no natural checkpoint where you would notice you had
stopped taking anything in. It also creates an unusually strong illusion of learning,
because watching feels like intake while producing little — so the learner is misled
about the content and about how well it went.

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

**What happens.** Writing down what someone is saying and understanding what they are
saying draw on the same resources. So notes taken live come out verbatim and shallow:
the hand is busy, the effort feels productive, and what is actually happening is closer
to copying than thinking. Then most of those notes are never opened again, so the whole
cost buys nothing.

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

**What happens.** Remembering to do something later is a specific weakness, separate
from wanting to do it. The intention is real — it simply does not surface at the moment
it is needed, and people are usually surprised and embarrassed when they notice. Any
system depending on it fails invisibly, because nobody reports the sessions that never
crossed their mind.

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

**What happens.** A streak works by being losable — that is the entire mechanism — which
means it is strongest right before it destroys itself. It also moves motivation off the
material and onto the counter, so when the counter resets the reason to continue goes
with it. For someone whose consistency is naturally uneven, the mechanic is calibrated
to fail.

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

**What happens.** A gap with nothing in it is an invitation to switch away, and
switching away is much easier than switching back. That is why the cost is not the
seconds but the session, since returning has to pay the full restart price. The wait
also breaks the thread of thought that the next piece was about to build on.

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

**What happens.** "Get the pods, delete web-z, then describe the replicaset" has to be
held in memory while step one is carried out. Capacity runs out and everything after the
first clause disappears. From outside this looks like not listening, so the usual
response is to repeat it louder — and repetition does not add capacity.

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

**What happens.** The rule is on page two and you need it on page five. Either you flip
back and lose the thread, or you reconstruct it from memory and get it slightly wrong.
Either way the effort goes into logistics rather than into the idea, and the difficulty
that creates gets blamed on the material being hard.

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

**What happens.** Filtering out what does not matter is the weak function, so a busy
page charges a toll on every glance while never showing up as one identifiable problem.
The worst offenders are the attractive irrelevant bits, because they win the competition
outright. This is why trying to make something more engaging by adding to it so often
makes it worse.

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

**What happens.** The willingness to start arrives in bursts and does not keep. Anything
you have to do first — configure, tidy, gather, plan — spends that burst, and then the
work does not happen. Preparation is doubly dangerous because it feels productive, so it
makes an excellent substitute for the task and can absorb a whole session without anyone
noticing.

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

**What happens.** No learning happens, and the wasted time is not the main cost. Boredom
here is an exit rather than an inefficiency, and it trains the learner to skim this
source — which then damages whatever came next and actually needed the attention.

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

**What happens.** A percentage of a total you cannot see is noise: it cannot tell you
whether to keep going, and it cannot produce the end-of-goal push because no credible
end is in sight. There is a further cost — an indicator that moves without anything real
happening teaches the learner that none of the signals mean anything.

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

**What happens.** Feedback aimed at the person rather than the work turns attention
inward onto self-evaluation, and that reliably damages performance. Where emotional
responses are stronger and take longer to settle, it can end the session outright and
colour the decision about coming back at all. The information in the feedback is usually
fine; the framing is what does the damage.

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

**What happens.** Variability is built in here rather than being a sign of fading
commitment. So a system tuned to yesterday's capacity is wrong on most days — too hard
on the bad ones, too easy on the good ones. Reading a bad day as backsliding then
prompts exactly the wrong move: more pressure, applied on the day capacity was already
lowest.

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

**What happens.** Time pressure fills working memory with monitoring and worry, and
working memory is what comprehension was using. That is why a clock produces blanking on
precisely the questions that needed thinking. None of this contradicts "add urgency" —
urgency helps you start, while a clock on thinking stops you. What matters is which of
the two you are timing.

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

**What happens.** "Just focus" asks someone to fix, through effort, the machinery that
allocates effort. It also frames the difficulty as a character flaw, which adds shame to
a task already being avoided and makes the next attempt less likely. And it carries no
information about what to do differently, so even when it is taken seriously there is
nothing to act on.

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
