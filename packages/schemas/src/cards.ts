import { z } from "zod";
import { Id } from "./ids";

/** 1 is intuition, 5 is expert. Sticky per learner, changeable per card. */
export const CardDepth = z.number().int().min(1).max(5);

export type CardDepthT = z.infer<typeof CardDepth>;

/** The five depth buttons under every card. */
export enum DepthAction {
  Simpler = "simpler",
  Deeper = "deeper",
  MoreConcrete = "more_concrete",
  WhyItMatters = "why_it_matters",
  WhereThisBreaks = "where_this_breaks",
}

export const DepthActionSchema = z.nativeEnum(DepthAction);

const JargonTerm = z.object({
  term: z.string().min(1).max(80),
  gloss: z.string().min(1).max(200),
});

/**
 * The fixed six slots. Keeping the shape identical everywhere is what lets the
 * eye stop hunting, and it forces the generator to produce the two parts that
 * are normally missing: the mechanism and the misconception.
 */
export const CardContent = z.object({
  claim: z.string().min(1).max(300),
  /** Capped at 5 items: a block longer than about six lines does not get read. */
  mechanism: z.array(z.string().min(1).max(400)).min(1).max(5),
  example: z.object({
    setup: z.string().min(1).max(500),
    result: z.string().min(1).max(500),
  }),
  misconception: z.object({
    belief: z.string().min(1).max(300),
    correction: z.string().min(1).max(500),
  }),
  jargon: z.array(JargonTerm).max(8),
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
