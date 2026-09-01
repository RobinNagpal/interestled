import { z } from "zod";
import { Id } from "./ids";
import { ContentStyleSchema, MAX_NODE_MINUTES } from "./topics";

/** 1 is intuition, 5 is expert. Sticky per learner, changeable per card. */
export const CardDepth = z.number().int().min(1).max(5);

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
  style: ContentStyleSchema,
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
 * It is also what makes a tightened limit safe. A cached card is re-parsed by
 * CardContent on every read, so narrowing a cap would reject rows the old cap
 * accepted and put an error where a card used to be — except that a bumped
 * revision means no row written under the old cap is ever looked up again.
 *
 * 2: the slots are one continuous explanation rather than six separate notes.
 * 3: the mechanism carries the card in short sentences, and the example and the
 *    misconception are written only where they apply.
 */
export const CARD_PROMPT_REVISION = 3;

/**
 * The cache key's variant half. Depth has a column of its own, so this carries
 * the rest: two settings that would produce different writing must never share
 * a cached card, and two that would not must never generate twice.
 */
export function cardVariant(settings: CardSettingsT): string {
  return `r${CARD_PROMPT_REVISION}|${settings.angle}|${settings.minutes}|${settings.style}`;
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
 * the two closing slots are short by design. Splitting the minutes evenly is
 * what made a ten-minute card arrive as four sections of throat-clearing around
 * two minutes of explanation.
 */
export const MECHANISM_SHARE = 0.8;

/**
 * What one mechanism item is written to: two short sentences. The prompt asks
 * for this and the schema's per-item cap is well above it, because the cap is
 * the outer bound of a badly behaved item rather than the target.
 */
export const MECHANISM_ITEM_WORDS = 45;

/**
 * The most items a card may carry: what the mechanism's share of the longest
 * card holds, plus the quarter the prompt's range runs over its target. Derived
 * rather than chosen, so the top of the range the prompt asks for can never be
 * a length the schema then refuses.
 */
export const MAX_MECHANISM_ITEMS = Math.ceil(
  ((CARD_MINUTES_MAX * WORDS_PER_MINUTE * MECHANISM_SHARE) / MECHANISM_ITEM_WORDS) * 1.25,
);

/**
 * The card's slots. The shape stays identical everywhere it applies — that is
 * what lets the eye stop hunting for where the point is — but three of the six
 * are what the card always is and two are what a particular node may not have.
 *
 * `claim` and `mechanism` are required, because they are the card: the answer
 * first, then why it behaves that way. `example` and `misconception` are
 * optional, because a slot the node cannot fill honestly gets filled dishonestly.
 * A node that is itself one case — a historical episode, one text, one event —
 * has no second case to instantiate it with, and asking for one anyway returns
 * the node restated under a heading that promises something new. Likewise a
 * purely descriptive node has no wrong belief to correct, so the slot comes back
 * carrying the topic's headline mistake for the fourth card running.
 *
 * They stay in the prompt as slots to be earned rather than skipped: the
 * mechanism and the misconception are the two parts normally missing from an
 * explanation, and the point of naming them is that they get written where they
 * apply. What the prompt supplies, and the schema cannot, is when that is.
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
   * Short sentences, and length arrives as more of them: a paragraph nobody
   * reads is not made readable by being one of five rather than one of forty.
   * The cap is roughly twice the words the prompt asks an item to be written
   * to, so it binds on a runaway paragraph and on nothing else.
   */
  mechanism: z.array(z.string().min(1).max(500)).min(1).max(MAX_MECHANISM_ITEMS),
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
