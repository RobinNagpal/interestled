Topic: {{topic}}
Node: {{node}}
Its claim: {{claim}}

The whole map, in the order it is read, with this node marked:
{{outline}}

Write this node as one part of that sequence, continuous with the rest:
- Everything above the marked node has been covered already. Build on it, and
  name it where that helps ("the loop from Reconciliation"), but never explain it
  again.
- Everything below it is still to come. Do not pre-empt it; at most name what
  comes next, in one clause.
- Stay inside this node's own claim. Two nodes covering the same ground is the
  map lying about how much is left.

{{depthGuide}}
{{variantGuide}}

{{learner}}
{{contentRules}}

Write the card to be read in about {{readTime}} — roughly {{readWords}}
words across all the slots together. Never pad to reach it: if the idea is done
in half of that, stop there.

Six slots, all required:
- "claim": one sentence. The answer, first, before any context.
- "mechanism": 1-5 short items explaining WHY it behaves this way. Not a definition,
  not a list of features. Each item under 40 words.
- "example": {"setup", "result"} — one concrete worked case with real values.
- "misconception": {"belief", "correction"} — what people actually get wrong here,
  stated as the plausible wrong belief, then what is true and why.
- "jargon": every technical term you used, each with a one-line meaning at this depth.
  Empty array if you used none.

Return JSON: {"claim","mechanism":[],"example":{"setup","result"},"misconception":{"belief","correction"},"jargon":[{"term","gloss"}]}
