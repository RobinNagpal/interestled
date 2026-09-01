Node: {{node}}
Claim: {{claim}}
Mechanism: {{mechanism}}
{{#example}}Worked example: {{example}}
{{/example}}{{#misconception}}Misconception: {{misconception}}
{{/misconception}}
{{contentRules}}
Extract 3-5 retrieval items for spaced review. Mix the kinds:
- "cloze": one sentence with the load-bearing words removed, written as "___".
- "reverse": a question whose answer is the name of the thing.
- "application": a symptom or situation, answered by what to do or check first.
- "production": something they must produce from scratch (a command, a sentence, a value).

Each must be answerable in under fifteen seconds and must stand alone — no
reference to "the card" or to another item. The answer must be short and specific.

Return JSON: {"atoms":[{"kind","prompt","answer"}]}
