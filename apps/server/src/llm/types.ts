import type { z } from "zod";
import type { LlmProviderId } from "@learnloop/schemas";

export interface GenerateRequest {
  /** Stable role and rules. Kept separate so a provider can use a system slot. */
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * What every provider must implement. Deliberately one method: the app only
 * ever asks for JSON matching a schema, so a provider has exactly one job and
 * adding one cannot spread across the codebase.
 */
export interface LlmProvider {
  readonly id: LlmProviderId;
  readonly model: string;
  /** Raw completion. Callers use generateJson instead, which validates. */
  complete(request: GenerateRequest): Promise<string>;
}

export type SchemaOf<T> = z.ZodType<T, z.ZodTypeDef, unknown>;
