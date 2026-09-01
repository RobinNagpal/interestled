Node: {{node}}
Claim: {{claim}}
Mechanism: {{mechanism}}
{{#misconception}}Common misconception: {{misconception}}
{{/misconception}}
{{contentRules}}
Write one drill of kind "{{kind}}".
{{kindGuide}}

- "prompt": the task itself. Everything needed to answer must be IN the prompt —
  never refer to "the card above" or a value from a previous screen.
- "completionTest": one line stating what will exist when they are done.
- "referencePoints": 2-5 things a good answer contains, each one checkable. These
  are what the answer gets compared against, so make them specific and separable.
- "hints": exactly 3, escalating — a nudge, then a narrowing, then near-reveal.

Return JSON: {"prompt","completionTest","referencePoints":[],"hints":[]}
