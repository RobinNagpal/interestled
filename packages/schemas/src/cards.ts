import { z } from "zod";
import { Id } from "./ids";
import {
  ContentFormatSchema,
  ParagraphLengthSchema,
  EnglishLevelSchema,
  MAX_NODE_MINUTES,
  TechnicalDetailSchema,
} from "./topics";

/** 1 is intuition, 5 is expert. Sticky per learner, changeable per card. */
export const CardDepth = z.number().int().min(1).max(5);

/**
 * Where a learner starts before any card has moved them. It is also the default
 * on users.default_depth — the screens have to name the depth a card is being
 * written to before the card arrives, and guessing a second number there would
 * describe a card the server never wrote.
 */
export const DEFAULT_CARD_DEPTH = 2;

export type CardDepthT = z.infer<typeof CardDepth>;

/**
 * The most a card may be written to, whatever the topic's read time says.
 * Past ten minutes the card would have to become a different shape — a
 * fifteen-minute node spends the rest on the drill and the doing.
 */
export const CARD_MINUTES_MAX = 10;

/** How long one card should take to read. Not the ladder: a node may say 6. */
export const CardMinutes = z.number().int().min(1).max(MAX_NODE_MINUTES);

/** Which way a step control moves: one rung down the ladder, or one up. */
export enum Step {
  Down = "down",
  Up = "up",
}

export const StepSchema = z.nativeEnum(Step);

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

/**
 * Everything that decides how one card comes out. The controls under a card set
 * these directly rather than naming an action for the server to interpret: a
 * button that cannot say what it changed is a button that looks broken when the
 * writing comes back similar.
 *
 * The topic's own settings are the defaults; each of these is the learner
 * overriding one of them for this card alone.
 */
export const CardSettings = z.object({
  depth: CardDepth,
  minutes: CardMinutes,
  englishLevel: EnglishLevelSchema,
  technicalDetail: TechnicalDetailSchema,
  format: ContentFormatSchema,
  paragraphLength: ParagraphLengthSchema,
  angle: CardAngleSchema,
});

export type CardSettingsT = z.infer<typeof CardSettings>;

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
 */
export const CARD_PROMPT_REVISION = 6;

/**
 * The cache key's variant half. Depth has a column of its own, so this carries
 * the rest: two settings that would produce different writing must never share
 * a cached card, and two that would not must never generate twice.
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
 * What one mechanism section is written to: a heading and a short paragraph
 * under it, two to four sentences long.
 *
 * It was 45 — one unlabelled item — and a ten-minute card was then thirty-odd
 * of them running down the screen with nothing to navigate by. A heading every
 * forty-five words is not a document, it is a glossary; at eighty there is a
 * paragraph under each one worth giving a name to.
 */
export const MECHANISM_SECTION_WORDS = 80;

/**
 * The most sections a card may carry: the mechanism's share of the longest card,
 * plus the quarter the prompt's range runs over its target. Derived rather than
 * chosen, so a count the prompt asks for can never be one the schema refuses.
 */
export const MAX_MECHANISM_SECTIONS = Math.ceil(
  ((CARD_MINUTES_MAX * WORDS_PER_MINUTE * MECHANISM_SHARE) / MECHANISM_SECTION_WORDS) * 1.25,
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
  body: z.string().min(1).max(800),
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
   * Short paragraphs under headings, and length arrives as more of them: a wall
   * of text is not made readable by being one of five rather than one of forty.
   * The body cap is well above what the prompt asks a section to be, so it binds
   * on a runaway paragraph and on nothing else.
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
