import { z } from "zod";
import { Id } from "./ids";

export const Email = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email("That does not look like an email address");

/**
 * Length is the only rule. Composition rules (a digit, a symbol, a capital)
 * push people towards predictable substitutions and are not worth the friction
 * at signup — see A14, setup before starting.
 */
export const Password = z
  .string()
  .min(10, "Use at least 10 characters — a short phrase works well")
  .max(200);

export const RegisterInput = z.object({ email: Email, password: Password });
export const LoginInput = z.object({ email: Email, password: z.string().min(1) });

/** Never carries the password hash: the schema has no field to put it in. */
export const User = z.object({
  id: Id,
  email: Email,
  createdAt: z.coerce.date(),
});

export const AuthResult = z.object({ token: z.string().min(1), user: User });

export type EmailT = z.infer<typeof Email>;
export type RegisterInputT = z.infer<typeof RegisterInput>;
export type LoginInputT = z.infer<typeof LoginInput>;
export type UserT = z.infer<typeof User>;
export type AuthResultT = z.infer<typeof AuthResult>;
