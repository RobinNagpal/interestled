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
share a subject. (Reference notes are the exception: that style asks for flat entries
to look up, and it overrides this paragraph.)

{{depthGuide}}
{{angleGuide}}

{{learner}}
{{contentRules}}

## Length

{{readWords}} words in all — about {{readTime}} of reading — of which
{{mechanismWords}} are the mechanism. Never pad to reach it: if the idea is done in
half of that, stop. Length comes from covering more of this node, never from
restating it.

## Slots

**claim** — required. One sentence: the answer, before any context.

**mechanism** — required, {{mechanismItems}} items, in order, on why it behaves this way.

- Short sentences. One or two per item, about {{itemWords}} words, never a paragraph.
  The card gets longer by having more items, not longer ones.
- Each item starts from what the one before it established. If the items could be
  shuffled without a reader noticing, they are a list rather than an explanation.
- Never label an item. No term followed by a colon, no bolded opener naming what
  the item is about: write "The Reichsbank bought bills with printed marks", not
  "Central bank monetization: the Reichsbank bought bills with printed marks".

**example** — `{"setup", "result"}`. Only where this node states a general rule and the
example is a different case the rule runs on: one concrete case with real values, that
same mechanism happening, in the same order and the same words for the same things.
Leave it out when the node already is one case — a historical episode, one text, one
event. It has no second case to instantiate it with, and the material belongs in the
mechanism instead.

**misconception** — `{"belief", "correction"}`. State what people actually get wrong
HERE as the plausible wrong belief, then what is true. Only where a reader could
still hold that belief having read everything above, and the correction names the step
above that rules it out. Leave it out when the node is descriptive and nothing in it is
misread: the subject's headline mistake belongs to the topic, not to this node.

**jargon** — required. Every technical term you used, with a one-line meaning at this
depth. Empty array if you used none.

Leave `example` or `misconception` out of the JSON entirely rather than filling it.

Return JSON: {"claim","mechanism":[],"example":{"setup","result"},"misconception":{"belief","correction"},"jargon":[{"term","gloss"}]}
