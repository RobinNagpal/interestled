import { z } from "zod";
import { Id } from "./ids";
import { ContentStyleSchema, MAX_NODE_MINUTES } from "./topics";

/** 1 is intuition, 5 is expert. Sticky per learner, changeable per card. */
export const CardDepth = z.number().int().min(1).max(5);

export type CardDepthT = z.infer<typeof CardDepth>;

/**
 * The most a card may be written to, whatever the topic's read time says.
 * Past ten minutes the six slots would have to become a different shape — a
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
 * The cache key's variant half. Depth has a column of its own, so this carries
 * the rest: two settings that would produce different writing must never share
 * a cached card, and two that would not must never generate twice.
 */
export function cardVariant(settings: CardSettingsT): string {
  return `${settings.angle}|${settings.minutes}|${settings.style}`;
}

const JargonTerm = z.object({
  term: z.string().min(1).max(80),
  gloss: z.string().min(1).max(200),
});

/**
 * The fixed six slots. Keeping the shape identical everywhere is what lets the
 * eye stop hunting, and it forces the generator to produce the two parts that
 * are normally missing: the mechanism and the misconception.
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
   * Each item stays short — a paragraph nobody reads is not made readable by
   * being one of five rather than one of ten — so length comes from the number
   * of them, which the prompt scales with the requested minutes.
   */
  mechanism: z.array(z.string().min(1).max(600)).min(1).max(12),
  example: z.object({
    setup: z.string().min(1).max(1500),
    result: z.string().min(1).max(1500),
  }),
  misconception: z.object({
    belief: z.string().min(1).max(600),
    correction: z.string().min(1).max(1500),
  }),
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
