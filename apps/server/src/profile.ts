import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ProfileUpdateInput } from "@interestled/schemas";
import type { ProfileT } from "@interestled/schemas";
import type { AuthEnv } from "./auth";
import type { Db } from "./db";
import { toProfile } from "./rows";

/**
 * The learner's profile: age, what they already know, and how they want it
 * explained. It is read by every generation call, so it is the one place where
 * an answer given once keeps paying — see learnerBlock in src/llm/prompts.ts.
 *
 * It lives on the user row rather than in its own table because there is exactly
 * one per account and nothing ever queries it on its own.
 */
export async function loadProfile(db: Db, userId: string): Promise<ProfileT> {
  return toProfile(await db.user.findUniqueOrThrow({ where: { id: userId } }));
}

export function profileRouter(db: Db): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  router.get("/", async (c) => c.json(await loadProfile(db, c.get("userId"))));

  /**
   * A whole-profile write, not a patch: the form always holds every field, and
   * a patch would make "cleared the age" indistinguishable from "did not send
   * the age".
   */
  router.put("/", zValidator("json", ProfileUpdateInput), async (c) => {
    const input = c.req.valid("json");
    const updated = await db.user.update({
      // Ownership is the whole of the authorisation model: this can only ever
      // write the row belonging to the token that made the request.
      where: { id: c.get("userId") },
      data: {
        age: input.age,
        background: input.background,
        learningStyles: input.learningStyles,
      },
    });
    return c.json(toProfile(updated));
  });

  return router;
}
