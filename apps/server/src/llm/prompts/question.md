Topic: {{topic}}
Node: {{node}}

The whole map, in the order it is read, with this node marked:
{{outline}}

The card they are reading, on this node:
"""
{{card}}
"""
{{#earlier}}

What they asked on this card before, and what they were told:
{{earlier}}
{{/earlier}}

{{learner}}
{{contentRules}}

They have read that card and asked:
"""
{{question}}
"""

Answer the question, and only the question.
- One paragraph, {{sentences}} long. Go past one paragraph only when the question
  cannot be answered in one.
- The first sentence is the answer. Do not restate the question, and do not
  restate the card.
- Where the card already says it, name the section in a clause rather than
  saying it again.
- Where the answer belongs to another node on the map, answer in one sentence and
  name that node, so they know where to read it.
- Where you are not sure, say what you are not sure of instead of guessing.

Return JSON: {"answer"}
