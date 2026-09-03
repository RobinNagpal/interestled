Produce a THREE-level map.

Level 1: {{mainHeadings}} parts of the subject, in "areas".
Level 2: {{subHeadings}} groups inside each area, in its "sections".
{{groupRules}}
Both levels are headings, and the same rules hold for each. An area is a part of
the subject big enough to hold several groups; a group holds the nodes.

Level 3: the nodes inside each group, in its "nodes".
{{minNodes}}-{{maxNodes}} of them, as many as that group needs to fit the time above.
{{leafRules}}

Return JSON: {"archetype":"...","areas":[{"key","title","claim","capability","sections":[{"key","title","claim","capability","nodes":[{"key","title","claim","minutes","capability","prerequisiteKeys"}]}]}]}
