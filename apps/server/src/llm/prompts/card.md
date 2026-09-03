Topic: {{topic}}
Node: {{node}}
Its claim: {{claim}}

The whole map, in the order it is read, with this node marked:
{{outline}}
{{#neighbours}}

What the nodes either side of it cover:
{{neighbours}}
{{/neighbours}}

Write this node as one part of that sequence:
- Everything above the marked node has been covered already. Never explain it again;
  name it in a clause where this node leans on it ("the loop from Reconciliation").
- Everything below it is still to come. Do not pre-empt it.
- Nothing that is true of the whole topic belongs on one node of it. If a sentence
  would sit just as well on a neighbouring node, it belongs on neither.

The slots are one continuous explanation read top to bottom, not separate notes that
share a subject. (Reference notes are the exception — that shape asks for flat entries
to look up, and it overrides this paragraph.)

{{depthGuide}}
{{angleGuide}}

{{learner}}
{{contentRules}}

## Length

Write about {{readTime}} of reading — {{readWords}} words in all, of which
{{mechanismWords}} are the mechanism. Never pad to reach it: if the idea is done in
half of that, stop. Length comes from covering more of this node, never from
restating it.

## Slots

**claim** — required. One sentence: the answer, before any context.

**mechanism** — required, {{mechanismSections}} sections of `{"heading", "body"}`, in
order, on why it behaves this way. Each is a paragraph with a name over it.

- The body is {{sectionSentences}}, about {{sectionWords}} words. Never longer:
  the card gets longer by having more sections, not bigger ones.
- Each sentence follows from the one before it. Keep the words that join them — so,
  which means, until, that is why — and never open a body by restating its own heading.
- Each section starts from what the one above it established, and the first one starts
  where the claim stopped. If the sections could be reordered without a reader
  noticing, they are a glossary rather than an explanation: reorder and rewrite until
  each one needs the one above it.
- The heading says what this step of the argument does, in plain text and at most six
  words. "Why the printing could not stop" is a heading; "Central bank monetization"
  is a label on a term, which is what makes the card read as a list of definitions.
  Plain text, so no `**` or backticks in it — the body is where Markdown goes.

**example** — `{"setup", "result"}`. Only where this node states a general rule and the
example is a different case the rule runs on: one concrete case with real values, that
same mechanism happening, in the same order and the same words for the same things.
Leave it out when the node already is one case — a historical episode, one text, one
event. It has no second case to instantiate it with, and the material belongs in the
mechanism instead.

**misconception** — `{"belief", "correction"}`. Only where a reader could still hold a
wrong belief having read everything above: what people actually get wrong HERE, as the
plausible belief, then what is true — and the correction names the step above that
rules it out. Leave it out when the node is descriptive and nothing in it is misread:
the subject's headline mistake belongs to the topic, not to this node.

**jargon** — required. Every technical term you used, with a one-line meaning at this
depth. Empty array if you used none.

Leave `example` or `misconception` out of the JSON entirely rather than filling it.

Return JSON: {"claim","mechanism":[{"heading","body"}],"example":{"setup","result"},"misconception":{"belief","correction"},"jargon":[{"term","gloss"}]}
