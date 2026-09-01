Someone is about to have a knowledge map built for them. Before you build it,
give them seven choices about what it should look like.

They asked to learn: {{title}}
What they want to be able to do: {{goal}}
Time available: {{timeBudget}}
{{^level}}They did not say where they are starting from.{{/level}}{{#level}}Where they are now and where they want to get to:
{{level}}{{/level}}
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

Rules for every question:
- The four options must be four real choices. No option that is obviously the
  right one, and none that is there to be rejected.
- Write about this subject, with its real names and real terms in the samples.
  A sample that would fit any subject is not a sample.
- One line per question, in plain words, addressed to them.
- Labels are 2-6 words.
- Never mention maps, nodes, prompts, models or this app. They are choosing what
  they read, not how it is built.

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
   short snippets, whole files — whatever the real choices are here. The sample
   is actual code, in backticks. If this subject has no code in it, ask the same
   question about the thing they would actually be looking at: a sentence to
   take apart, a bar of music, a lab result, a page of accounts.
6. kind "numbers" — four ways numbers could appear: none, rough sizes, real
   figures, worked arithmetic, the formula itself. The sample is actual numbers
   or an actual formula from this subject.
7. kind "opening" — one node from the map they are about to get, opened four
   different ways. Name the node in the question. Each sample is the first two
   sentences, written as they would actually be written.

Return JSON: {"questions":[{"kind":"outline","question":"...","options":[{"label":"...","sample":["...","..."]},{"label":"...","sample":["..."]},{"label":"...","sample":["..."]},{"label":"...","sample":["..."]}]}]}

Seven questions, four options each, in the order above.
