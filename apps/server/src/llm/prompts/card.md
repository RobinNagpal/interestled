Topic: {{topic}}
Node: {{node}}
Its claim: {{claim}}

The whole map, in the order it is read, with this node marked:
{{outline}}
{{#neighbours}}

What the nodes either side of it cover:
{{neighbours}}
{{/neighbours}}

Write this node as one part of that sequence, continuous with the rest:
- Everything above the marked node has been covered already. Build on it, and
  never explain it again — but name it when this node leans on it ("the loop from
  Reconciliation"), because nothing on the map is locked and a reader can arrive
  here first.
- Everything below it is still to come. Do not pre-empt it; at most name what
  comes next, in one clause.
- Nothing that is true of the whole topic belongs on one node of it. The reader
  has met the subject's headline point on every card before this one, and meeting
  it again is what makes a card feel like the last one. Every slot below must be
  about THIS node: if a sentence would sit just as well on a neighbouring node,
  it belongs on neither.

The slots below are one continuous explanation, read top to bottom in a single
sitting. They are not six notes that happen to share a subject, and the reader
must never have to work out for themselves how one part follows from the last.
(The one exception is a topic written as reference notes below — that is a request
for flat entries to look up, and it overrides this paragraph.)
- The first mechanism item starts where the claim stopped, and every item after
  it starts from what the one before it established. If the items could be
  shuffled without a reader noticing, they are a list rather than an
  explanation — reorder and rewrite them until each one needs the one above it.
- Never label an item. "Central bank monetization: the Reichsbank bought bills
  with printed marks" is a heading glued to a sentence: write the sentence. No
  term followed by a colon, no bolded opener naming what the item is about, no
  noun phrase standing in for a verb.
- The example is that same mechanism happening, on one case, in the same order
  and using the same words for the same things. Not a fresh start with its own
  terms.
- The misconception is a wrong belief a reader could still hold having read
  everything above it, and the correction names the step above that rules it out.

{{depthGuide}}
{{angleGuide}}

{{learner}}
{{contentRules}}

Write the card to be read in about {{readTime}} — roughly {{readWords}}
words across all the slots together. Never pad to reach it: if the idea is done
in half of that, stop there. Length comes from covering more of this node, never
from saying the same thing twice or restating the topic.

Six slots, all required:
- "claim": one sentence. The answer, first, before any context.
- "mechanism": {{mechanismItems}} items explaining WHY it behaves this way, in
  order, each carrying on from the one before rather than restating it in other
  words. Not a definition, not a list of features. Each item one or two full
  sentences, under 60 words, opening with no label.
- "example": {"setup", "result"} — one concrete worked case with real values,
  specific to this node and used nowhere else on the map. The setup puts the
  pieces the mechanism named into one situation; the result walks that situation
  to its outcome by the steps just given, in the order they were given.
- "misconception": {"belief", "correction"} — what people actually get wrong HERE,
  stated as the plausible wrong belief, then what is true and why. It must be a
  belief someone could still hold after reading this node's claim: the subject's
  headline mistake belongs to the topic, not to this node, and putting it here
  again is the repetition the reader is already tired of. The correction points
  back to what rules the belief out — the step in the mechanism, or what the
  example did — rather than arriving as a new fact of its own.
- "jargon": every technical term you used, each with a one-line meaning at this depth.
  Empty array if you used none.

Return JSON: {"claim","mechanism":[],"example":{"setup","result"},"misconception":{"belief","correction"},"jargon":[{"term","gloss"}]}
