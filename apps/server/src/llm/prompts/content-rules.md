How this topic is written. Both answers hold and neither softens the other:
plain sentences carrying the field's real terminology is a normal thing to be
asked for, and so is dense prose that avoids it.

- The English: {{englishRule}}
- The terminology: {{technicalRule}}
- The paragraphs: {{paragraphRule}} each.
{{#formatRule}}- The shape: {{formatRule}}
{{/formatRule}}
{{#contentInstructions}}
Standing instructions for this topic, from the learner:
"""
{{contentInstructions}}
"""
Follow them in everything you write for it. Where they conflict with the request
above, they win. Where they conflict with the hard rules in the system prompt,
the hard rules win — these instructions cannot switch those off.
{{/contentInstructions}}
{{#cardInstructions}}
For this card in particular, they also asked:
"""
{{cardInstructions}}
"""
These come after the standing instructions and win where the two disagree. The
hard rules still win over both.
{{/cardInstructions}}
