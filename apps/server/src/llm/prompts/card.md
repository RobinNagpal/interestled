Topic: {{topic}}
Node: {{node}}
Its claim: {{claim}}

{{depthGuide}}
{{variantGuide}}

{{learner}}

Write the card. Six slots, all required:
- "claim": one sentence. The answer, first, before any context.
- "mechanism": 1-5 short items explaining WHY it behaves this way. Not a definition,
  not a list of features. Each item under 40 words.
- "example": {"setup", "result"} — one concrete worked case with real values.
- "misconception": {"belief", "correction"} — what people actually get wrong here,
  stated as the plausible wrong belief, then what is true and why.
- "jargon": every technical term you used, each with a one-line meaning at this depth.
  Empty array if you used none.

Return JSON: {"claim","mechanism":[],"example":{"setup","result"},"misconception":{"belief","correction"},"jargon":[{"term","gloss"}]}
