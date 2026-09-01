Each of these:
- "key": short slug, unique across the WHOLE map, lowercase with underscores.
- "title": 2-6 words.
- "claim": ONE sentence answering "what is this, really?". Not a definition.
- "minutes": honest reading+doing time. Aim for about {{averageMinutes}} a node,
  and nothing may exceed {{maxMinutes}}. Split anything bigger into two nodes.
- "capability": what they can do once it is verified, starting with a verb
  ("read a manifest and say what it does"). This is how progress gets reported,
  so it must be checkable, not "understand X".
- "prerequisiteKeys": keys of nodes genuinely needed first, at most 3. These are
  advisory notes, never gates, so include only real dependencies. They may name a
  node in any group, not only this one.
