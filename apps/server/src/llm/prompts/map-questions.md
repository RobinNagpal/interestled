Someone is about to have a knowledge map built for them. Before you build it,
give them seven choices about what it should look like.

They asked to learn: {{title}}
What they want to be able to do: {{goal}}
Time available: {{timeBudget}}
{{^level}}They did not say where they are starting from.{{/level}}{{#level}}Where they are now and where they want to get to:
{{level}}
No option should cover what they already have, and none should go past where
they said they want to get to.{{/level}}
The map will have {{levelCount}} levels.

{{learner}}
{{contentRules}}
{{instructions}}
{{current}}

Each question has exactly four options. An option is a short label and a sample.

The sample is the thing itself, not a description of it. For a question about
headings, the sample is the headings. For a question about examples, it is the
opening of a real example from this subject. Someone should be able to pick by
reading the samples and never reading the labels.

A sample is a list of strings and each string is drawn on its own line, so put
one heading, one item or one sentence in each. Six lines is the most any sample
may have, and no line runs past about eighty words. A fenced code block goes
inside a single string, never split across two.

Rules for every question:
- The four options must be four real choices. No option that is obviously the
  right one, and none that is there to be rejected.
- Write about this subject, with its real names and real terms in the samples.
  A sample that would fit any subject is not a sample.
- Each question is one line, in plain words, addressed to them.
- Labels are 2-6 words.
- No question and no label mentions maps, nodes, prompts, models or this app.
  They are choosing what they read, not how it is built.

Ask these seven, in this order. The "kind" is the exact string in the JSON.

1. kind "outline" — four sets of 3-5 top-level headings for this subject. Each
   set cuts the subject a different way: by the parts it is made of, by the jobs
   they want to do with it, by the order things happen in, by what goes wrong.
   The sample is the headings, one per line.
2. kind "breakdown" — take the heading that will carry the most of this subject
   and break it up four different ways, 3-5 items each. Name that heading in the
   question. The sample is the items, one per line.
3. kind "scope" — four things the map could leave out to stay short. Each option
   names what goes, not what stays. The sample is the specific things dropped.
4. kind "examples" — four kinds of worked example. The sample is the first line
   or two of an actual example of that kind, from this subject.
5. kind "code" — four ways code could appear: none at all, one-line commands,
   a few lines, a short annotated block — whatever the real choices are here. The
   sample is actual code, in backticks, and a few lines of it at most; for the
   option with no code in it, the sample is the same thing said in words. If this
   subject has no code anywhere, ask the same question about what they would
   actually be looking at: a sentence to take apart, a bar of music, a lab
   result, a page of accounts.
6. kind "numbers" — four ways numbers could appear: none, rough sizes, real
   figures, worked arithmetic, the formula itself. The sample is actual numbers
   or an actual formula from this subject.
7. kind "opening" — pick one thing from this subject that will get its own short
   write-up, and open it four different ways. Name that thing in the question.
   Each sample is the first two sentences, written as they would really be
   written.

Return JSON: {"questions":[{"kind":"outline","question":"...","options":[{"label":"...","sample":["...","..."]},{"label":"...","sample":["..."]},{"label":"...","sample":["..."]},{"label":"...","sample":["..."]}]}]}

Seven questions, four options each, in the order above.
