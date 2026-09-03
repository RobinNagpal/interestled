import { z } from "zod";
import { Id } from "./ids";
import {
  ContentFormatSchema,
  ParagraphLength,
  ParagraphLengthSchema,
  EnglishLevelSchema,
  MAX_NODE_MINUTES,
  TechnicalDetailSchema,
} from "./topics";

/** The ends of the depth scale, named once: the schema, the clamp and the chips all read them. */
export const MIN_CARD_DEPTH = 1;
export const MAX_CARD_DEPTH = 5;

/** 1 is intuition, 5 is expert. Sticky per learner, changeable per card. */
export const CardDepth = z.number().int().min(MIN_CARD_DEPTH).max(MAX_CARD_DEPTH);

/**
 * Where a learner starts before any card has moved them. It is also the default
 * on users.default_depth — the screens have to name the depth a card is being
 * written to before the card arrives, and guessing a second number there would
 * describe a card the server never wrote.
 */
export const DEFAULT_CARD_DEPTH = 2;

export type CardDepthT = z.infer<typeof CardDepth>;

/**
 * The scale in order, for the row of chips that offers it. Derived from the
 * bounds above rather than written out again: a scale stated twice is a scale
 * that can be widened in one place and not the other, and the chip nobody can
 * press is the half of it that stayed behind.
 */
export const CARD_DEPTHS: readonly CardDepthT[] = Array.from(
  { length: MAX_CARD_DEPTH - MIN_CARD_DEPTH + 1 },
  (_, index) => MIN_CARD_DEPTH + index,
);

/**
 * The most a card may be written to, whatever the topic's read time says.
 * Past ten minutes the card would have to become a different shape — a
 * fifteen-minute node spends the rest on the drill and the doing.
 */
export const CARD_MINUTES_MAX = 10;

/** How long one card should take to read. Not the ladder: a node may say 6. */
export const CardMinutes = z.number().int().min(1).max(MAX_NODE_MINUTES);

/**
 * The angle a card is written from at a given depth. `Base` is the plain card;
 * the other three ask the same depth a different way, which is why they are a
 * separate axis from the depth number rather than more values on it.
 */
export enum CardAngle {
  Base = "base",
  MoreConcrete = "more_concrete",
  WhyItMatters = "why_it_matters",
  WhereThisBreaks = "where_this_breaks",
}

export const CardAngleSchema = z.nativeEnum(CardAngle);

/** Shared with the app, so the box stops at the same length the server refuses. */
export const CARD_INSTRUCTIONS_MAX = 2000;

/**
 * What the learner wants for one card in particular, in their own words. Kept
 * on the node rather than on the card, so it is still there the next time the
 * card is written; sent to the model after the topic's standing instructions,
 * and it wins where the two disagree. "" means nothing has been asked.
 */
export const CardInstructions = z.string().trim().max(CARD_INSTRUCTIONS_MAX);

/**
 * Everything that decides how one card comes out. The controls under a card set
 * these directly rather than naming an action for the server to interpret: a
 * button that cannot say what it changed is a button that looks broken when the
 * writing comes back similar.
 *
 * The topic's own settings are the defaults; each of these is the learner
 * overriding one of them for this card alone. `instructions` is the one that is
 * not a chip: it is the node's own text, read off the row rather than sent in
 * the query, and stored on the card beside the writing it shaped.
 */
export const CardSettings = z.object({
  depth: CardDepth,
  minutes: CardMinutes,
  englishLevel: EnglishLevelSchema,
  technicalDetail: TechnicalDetailSchema,
  format: ContentFormatSchema,
  paragraphLength: ParagraphLengthSchema,
  angle: CardAngleSchema,
  instructions: CardInstructions,
});

export type CardSettingsT = z.infer<typeof CardSettings>;

/** The text the learner saves for one card. A whole-value write, like every other settings box. */
export const CardInstructionsInput = z.object({ instructions: CardInstructions });

export type CardInstructionsInputT = z.infer<typeof CardInstructionsInput>;

/**
 * Which generation of the card prompt wrote a cached card.
 *
 * Cards are cached forever and keyed by the settings alone, so changing how a
 * card is written changes nothing a learner ever sees: every node already opened
 * keeps the card the old prompt produced, and the change shows up only on nodes
 * nobody has read yet. Bumping this retires the lot in one line — it is part of
 * the variant string, so there is no migration and nothing to delete. The
 * superseded rows are never read again and go with their node.
 *
 * Bump it when a change to card.md or the system prompt changes how an existing
 * card should read. Do not bump it for a change that only affects which nodes
 * get written.
 *
 * It is also what makes a tightened limit safe: a cached card is re-parsed by
 * CardContent on every read, so narrowing a cap would reject rows the old cap
 * accepted, unless a bumped revision means none of them is looked up again.
 *
 * 2: the slots are one continuous explanation rather than six separate notes.
 * 3: the mechanism carries the card in short sentences, and the example and the
 *    misconception are written only where they apply.
 * 4: how hard the English is and how much terminology appears are asked
 *    separately, so the same card reads differently under either answer.
 * 5: the mechanism is headed sections rather than a run of unlabelled items.
 * 6: paragraph length is asked, so the same card comes back in longer or
 *    shorter paragraphs under the same depth and register.
 * 7: and it now reaches the prompt. At 6 it was in the key and nowhere else:
 *    the card prompt asked for two to four sentences a section whatever the
 *    setting said, and the rules block never mentioned it at all unless the
 *    learner had left their standing instructions at the seeded text.
 */
export const CARD_PROMPT_REVISION = 7;

/**
 * The cache key's variant half. Depth has a column of its own, so this carries
 * the rest: two settings that would produce different writing must never share
 * a cached card, and two that would not must never generate twice.
 *
 * The instructions are deliberately not in it. They are free text, so they
 * cannot be a key without being hashed, and a hash cannot be read back into
 * the settings a row was written to. The row stores the text instead, and a
 * card found at its key with other instructions on it is answered as it is —
 * the panel says the settings have moved, and the learner decides whether to
 * write it again. That is the same rule every other setting follows now.
 */
export function cardVariant(settings: CardSettingsT): string {
  return [
    `r${CARD_PROMPT_REVISION}`,
    settings.angle,
    settings.minutes,
    settings.englishLevel,
    settings.technicalDetail,
    settings.format,
    settings.paragraphLength,
  ].join("|");
}

/**
 * The settings a cached row was written to, read back off its key.
 *
 * This is what lets a node answer with the card it already has when nothing is
 * cached at the settings being asked for — the topic's settings moved, or the
 * learner's depth did — instead of writing a new one on the spot. The row has
 * to be able to say what it is, or the panel under it cannot.
 *
 * Null for a row written under an earlier prompt revision, so bumping the
 * revision still retires every cached card: a row that cannot be named is one
 * that is never served. Null too for anything that does not parse, which is the
 * same outcome for the same reason.
 */
export function parseCardVariant(
  variant: string,
  depth: number,
  instructions: string,
): CardSettingsT | null {
  const parts = variant.split("|");
  if (parts.length !== 7 || parts[0] !== `r${CARD_PROMPT_REVISION}`) {
    return null;
  }
  const parsed = CardSettings.safeParse({
    depth,
    angle: parts[1],
    minutes: Number(parts[2]),
    englishLevel: parts[3],
    technicalDetail: parts[4],
    format: parts[5],
    paragraphLength: parts[6],
    instructions,
  });
  return parsed.success ? parsed.data : null;
}

const JargonTerm = z.object({
  term: z.string().min(1).max(80),
  gloss: z.string().min(1).max(200),
});

/** Ordinary adult prose, and the only reason the minutes can become a word count. */
export const WORDS_PER_MINUTE = 200;

/**
 * How much of a card's reading time the mechanism carries. It is the slot that
 * explains, so it is the slot that gets the time; the claim is one sentence and
 * the two closing slots are short by design.
 */
export const MECHANISM_SHARE = 0.8;

/**
 * What one mechanism section is written to, in words: a heading and the
 * paragraph under it, at the length this topic asked its paragraphs to be.
 *
 * A record rather than a constant, because a card's word budget comes from its
 * read time and the only thing a longer paragraph can change is how that budget
 * is cut up — the same card in fewer, longer sections. Fixed at 80 it made
 * paragraphLength unanswerable: the prompt asked for two to four sentences
 * whatever the chip said, so moving it wrote the same card again under a new
 * cache key.
 *
 * The numbers are PARAGRAPH_SENTENCES at ordinary sentence lengths, and the
 * middle one is the 80 that stood here alone. It was 45 once — one unlabelled
 * item — and a ten-minute card was thirty-odd of them running down the screen
 * with nothing to navigate by. Below fifty a heading every other sentence is a
 * glossary rather than a document, which is why Short stops there.
 */
export const MECHANISM_SECTION_WORDS: Record<ParagraphLength, number> = {
  [ParagraphLength.Short]: 50,
  [ParagraphLength.Medium]: 80,
  [ParagraphLength.Long]: 130,
};

/**
 * The most sections a card may carry: the mechanism's share of the longest card
 * cut into the shortest paragraphs, plus the quarter the prompt's range runs
 * over its target. Derived rather than chosen, so a count the prompt asks for
 * can never be one the schema refuses.
 */
export const MAX_MECHANISM_SECTIONS = Math.ceil(
  ((CARD_MINUTES_MAX * WORDS_PER_MINUTE * MECHANISM_SHARE) /
    Math.min(...Object.values(MECHANISM_SECTION_WORDS))) *
    1.25,
);

/**
 * One step of the explanation: what this part is, and the part itself.
 *
 * The heading is plain text, like every other title in the product — it is set
 * as a heading rather than parsed as one, so a `**bold**` in it would render as
 * asterisks. The body is Markdown like the rest of the card.
 *
 * The pair replaced a bare string, and the rule the bare string needed goes with
 * it: `card.md` used to ban `Central bank monetization: the Reichsbank bought…`,
 * a heading glued to a sentence, because that is what a model reaches for when
 * asked for separate items with nowhere to put a name. Now there is somewhere to
 * put it. What the prompt has to keep saying is the other half — that the
 * sections are still one argument in order, not entries in a glossary that
 * happen to share a subject.
 */
const MechanismSection = z.object({
  heading: z.string().min(1).max(80),
  body: z.string().min(1).max(1500),
});

export type MechanismSectionT = z.infer<typeof MechanismSection>;

/**
 * The card's slots, in the order they are read. The shape stays identical
 * wherever a slot applies — that is what lets the eye stop hunting for where the
 * point is — but two of the five are things a particular node may not have.
 *
 * `claim`, `mechanism` and `jargon` are required, because they are the card: the
 * answer first, then why it behaves that way, then the words that took. The
 * other two are optional, because a slot the node cannot fill honestly gets
 * filled dishonestly — and both stay in the prompt as slots to be earned, with
 * the test for earning them stated there. When a slot applies is a judgement
 * about the node, which is the one thing the schema cannot make.
 *
 * The limits are the outer bound of a ten-minute card, not the size of an
 * ordinary one — what a particular card is written to is the minutes in
 * CardSettings, and the prompt asks for a count and a length to match. A cap
 * that fits a three-minute card is what made a ten-minute setting come back as
 * three minutes of writing: the schema refused the rest.
 */
export const CardContent = z.object({
  claim: z.string().min(1).max(300),
  /**
   * Paragraphs under headings, and length arrives as more of them: a wall of
   * text is not made readable by being one of five rather than one of forty.
   * The body cap is well above the longest paragraph asked for, so it binds on
   * a runaway paragraph and on nothing else — at 800 it sat right on what the
   * Long setting produces, and would have refused a card for doing as it was
   * told.
   */
  mechanism: z.array(MechanismSection).min(1).max(MAX_MECHANISM_SECTIONS),
  example: z
    .object({
      setup: z.string().min(1).max(1500),
      result: z.string().min(1).max(1500),
    })
    .optional(),
  misconception: z
    .object({
      belief: z.string().min(1).max(600),
      correction: z.string().min(1).max(1500),
    })
    .optional(),
  jargon: z.array(JargonTerm).max(12),
});

export const ConceptCard = z.object({
  id: Id,
  nodeId: Id,
  depth: CardDepth,
  content: CardContent,
  createdAt: z.coerce.date(),
});

export type CardContentT = z.infer<typeof CardContent>;
export type ConceptCardT = z.infer<typeof ConceptCard>;
