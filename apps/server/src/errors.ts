import { z } from "zod";

/** Thrown when a write would violate a business rule. */
export class ConflictError extends Error {}

export class NotFoundError extends Error {}

/** The configured LLM failed or returned something the schema rejected. */
export class GenerationError extends Error {}

/**
 * What Prisma puts in a P2002's `meta`: the columns that collided.
 *
 * Here rather than beside either reader, because both of them — the message
 * app.ts writes and the retry auth.ts runs — are guessing at the same shape,
 * and a Prisma release that reported the constraint name instead would break
 * the retry silently while only making the message read oddly.
 */
export const UniqueViolation = z.object({ target: z.array(z.string()) });
