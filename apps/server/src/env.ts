import "dotenv/config";
import { z } from "zod";
import { LlmProviderId, LlmProviderIdSchema } from "@learnloop/schemas";

/**
 * Provider keys are all optional here and checked when the provider is actually
 * built, so running with LLM_PROVIDER=gemini does not require an OpenAI key.
 */
const Env = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().int().positive().default(7071),
  LLM_PROVIDER: LlmProviderIdSchema.default(LlmProviderId.Gemini),
  LLM_MODEL: z.string().min(1).default("gemini-2.0-flash"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
});

export const env = Env.parse(process.env);

export type EnvT = z.infer<typeof Env>;
