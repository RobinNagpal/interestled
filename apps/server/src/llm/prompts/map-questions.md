Someone is about to have a knowledge map built for them. Before you build it,
give them seven choices about what it should look like.

They asked to learn: {{title}}
{{^goal}}They did not say what they want it for.{{/goal}}{{#goal}}How they plan to use this:
{{goal}}{{/goal}}
{{^level}}They did not say what they already know.{{/level}}{{#level}}What they already know:
{{level}}{{/level}}

How they want the map built:
{{mapInstructions}}

{{learner}}
{{contentRules}}

Each question has exactly four options. An option is a short label and a sample.

They may pick more than one option per question, so write four that can be
combined as well as taken alone. Two picked together should read as one coherent
instruction, not as a contradiction.

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
- No option is the whole of another. Four that overlap that much leave nothing to
  choose between, and picking two of them says nothing.
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
3. kind "known" — read what they said they already know and turn it into four
   sets of headings the map could drop because of it. Each set is 2-4 named
   things, and each is a different reading of what they wrote: the literal one,
   a wider one that assumes the neighbouring ideas too, a narrower one that
   keeps anything they might only half know, and one that drops nothing because
   what they wrote does not cover this subject's own material. The sample is the
   headings that would go. If they said nothing about what they know, ask instead
   which parts of this subject people usually arrive already knowing.
4. kind "recap" — for whatever comes out under the last question, four ways it
   could still be mentioned on the way past: not at all, one line naming it, a
   short refresher, or kept in full after all. The sample is what that would look
   like for one of the things being dropped.
5. kind "scope" — four things the map could leave out to stay inside the time
   they have. Each option names what goes, not what stays. The sample is the
   specific things dropped.
6. kind "examples" — four kinds of worked example. The sample is the first line
   or two of an actual example of that kind, from this subject.
7. kind "opening" — pick one thing from this subject that will get its own short
   write-up, and open it four different ways. Name that thing in the question.
   Each sample is the first two sentences, written as they would really be
   written.

Return JSON: {"questions":[{"kind":"outline","question":"...","options":[{"label":"...","sample":["...","..."]},{"label":"...","sample":["..."]},{"label":"...","sample":["..."]},{"label":"...","sample":["..."]}]}]}

Seven questions, four options each, in the order above.
