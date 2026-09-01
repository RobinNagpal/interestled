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
- "mechanism": {{mechanismItems}} items explaining WHY it behaves this way, each a
  separate step or reason rather than a longer version of the one before. Not a
  definition, not a list of features. Each item under 60 words.
- "example": {"setup", "result"} — one concrete worked case with real values,
  specific to this node and used nowhere else on the map.
- "misconception": {"belief", "correction"} — what people actually get wrong HERE,
  stated as the plausible wrong belief, then what is true and why. It must be a
  belief someone could still hold after reading this node's claim: the subject's
  headline mistake belongs to the topic, not to this node, and putting it here
  again is the repetition the reader is already tired of.
- "jargon": every technical term you used, each with a one-line meaning at this depth.
  Empty array if you used none.

Return JSON: {"claim","mechanism":[],"example":{"setup","result"},"misconception":{"belief","correction"},"jargon":[{"term","gloss"}]}
