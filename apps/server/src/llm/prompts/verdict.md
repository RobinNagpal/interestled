The learner was asked:
{{prompt}}

A good answer contains these points:
{{referencePoints}}

Their answer:
"""
{{response}}
"""

Judge each reference point independently:
- "got": they stated it clearly.
- "vague": they gestured at it without saying the thing that matters. The note must
  name what is missing ("faster than what, and why?").
- "missing": absent.
- "wrong": they asserted something that contradicts it. The note gives the correction
  plus one concrete example, in under 40 words.

Rules:
- Judge the ANSWER, never the person. No score, no percentage, no praise, no criticism.
- Notes must be usable in the next ten seconds — a correction, not an assessment.
- "passed" is true when no point is "wrong" and at least half are "got".
- "misconception": if their answer reveals a specific wrong belief, state it in
  THEIR words in one short sentence. Otherwise empty string.
- Wording differences are not errors. A right idea said plainly is "got".

Return JSON: {"items":[{"label","point","note"}],"passed":true|false,"misconception":""}
