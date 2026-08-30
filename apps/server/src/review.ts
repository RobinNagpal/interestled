import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { NodeStatusSchema, ReviewGrade, ReviewInput } from "@learnloop/schemas";
import { afterLapse, dueNow, reschedule } from "@learnloop/domain";
import type { AuthEnv } from "./auth";
import type { Db } from "./db";
import { NotFoundError } from "./errors";
import { toAtom } from "./rows";

export function reviewRouter(db: Db): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  /**
   * The batch, not the backlog. Everything overdue stays due; only three items
   * are ever offered, because a queue of two hundred is a wall people do not
   * climb — which is how a two-week absence turns into never coming back.
   */
  router.get("/", async (c) => {
    const rows = await db.atom.findMany({
      where: { userId: c.get("userId"), dueAt: { lte: new Date() } },
      orderBy: { dueAt: "asc" },
      // Enough rows for the mixer to interleave across nodes without loading all.
      take: 60,
    });
    const batch = dueNow(rows.map(toAtom), new Date());
    return c.json({ atoms: batch, dueCount: rows.length });
  });

  router.post("/", zValidator("json", ReviewInput), async (c) => {
    const userId = c.get("userId");
    const input = c.req.valid("json");
    const row = await db.atom.findFirst({ where: { id: input.atomId, userId } });
    if (row === null) {
      throw new NotFoundError("Review item not found");
    }
    const atom = toAtom(row);
    const schedule = reschedule(atom, input.grade, new Date());
    await db.atom.update({ where: { id: atom.id }, data: schedule });

    // A miss reopens the source node, so forgetting shows up as visible work on
    // the map rather than as invisible decay.
    if (input.grade === ReviewGrade.Missed) {
      const node = await db.learningNode.findUnique({ where: { id: atom.nodeId } });
      if (node !== null) {
        await db.learningNode.update({
          where: { id: node.id },
          data: { status: afterLapse(NodeStatusSchema.parse(node.status)) },
        });
      }
    }
    return c.json({ atomId: atom.id, ...schedule });
  });

  return router;
}
