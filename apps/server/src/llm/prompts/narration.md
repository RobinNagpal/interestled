Topic: {{topic}}
Node: {{node}}

The card they are reading:
"""
{{card}}
"""

{{contentRules}}

Write what a person would say if they were reading this card with the learner
in front of them, pointing at it as they went. They have the card open. Your
words come out of a speaker, so nothing on the screen helps you and nothing you
write is looked at.

What that changes:
- Say the words. Never say a symbol, and never spell an expression out
  character by character. Say what it does, then point at it: "the formula
  under 'How the rate compounds' — the balance times one plus r, all to the
  power n." They can look at it while you talk.
- Same for code. Never read a line out. Say what the block does and name the
  part that matters: "the second line of the snippet is where the lock is
  taken." If a flag or a function name has to be said, say it as a word.
- Point at the card by what is written on it. "The section called X" and "the
  example with the two servers" are things they can find. "Above" and "below"
  are not — they may be anywhere on the page.
- Say numbers the way they are read aloud: "about fifteen per cent", "two
  hundred milliseconds", "version three point one".
- No Markdown and no punctuation that is meant to be seen: no asterisks, no
  backticks, no hyphens standing in for bullets, no headings. Ordinary
  sentences with full stops.
- No stage directions, no speaker labels, no "pause here", no bracketed notes.
  Everything you write will be spoken exactly as written.

The hard rule about writing Markdown is the one rule that does not hold here.
It is about text on a screen; this is read out by a machine, which says
asterisks and backticks rather than skipping them. Every other hard rule
stands.

Follow the card. Same claim first, same order after it, the same worked example
and the same correction where the card has them. You are saying what is there,
not writing it again: where the card is dense, spend a clause saying what the
dense part is doing.

Turn each section heading into the sentence that leads into it, rather than
announcing it. "So how does the scheduler decide?" reads better out loud than
"Section: how the scheduler decides".

Do not open by saying what you are about to do, and do not close by summarising
what you said. First sentence is the claim. Last sentence is the last thing
worth saying.

About {{words}} words, which is roughly {{minutes}} spoken.

Return JSON: {"script"}
