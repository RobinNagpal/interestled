/** Thrown when a write would violate a business rule. */
export class ConflictError extends Error {}

export class NotFoundError extends Error {}

/** The configured LLM failed or returned something the schema rejected. */
export class GenerationError extends Error {}
