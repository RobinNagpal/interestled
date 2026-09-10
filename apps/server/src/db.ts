import { PrismaClient } from "@prisma/client";

/**
 * The password hash is omitted globally: no query returns it unless a call site
 * explicitly opts back in, which only the login check does.
 */
export type Db = PrismaClient<{ omit: { user: { passwordHash: true } } }>;

export function createDb(): Db {
  return new PrismaClient({ omit: { user: { passwordHash: true } } });
}

/**
 * The half of every topic lookup that says "not archived".
 *
 * Archiving is one nullable column and this clause: the row and everything
 * hanging off it stays exactly where it is, and every way in stops answering —
 * the list, the topic's own URL, its nodes and their drills, its review items, a
 * study session on it, and the public routes. It is a constant rather than two
 * words typed at each of those, because the one that forgets it is the one that
 * shows a learner the topic they just archived. It was forgotten once already:
 * the attempts route reads a drill without going through loadNode, and graded
 * one, spent two model calls on it and moved a node's status inside a topic
 * nothing may show.
 *
 * It lives here rather than beside findTopic in topics.ts so that review.ts and
 * sessions.ts do not import the router that owns the LLM and prompt modules to
 * get at it — a cycle through that graph resolves to `undefined` in the CommonJS
 * bundle, and `archivedAt: undefined` matches every row.
 *
 * Two lookups deliberately do not carry it, and both say so where they are:
 * freeTopicSlug, because an archived topic keeps its slug and the unique index
 * still covers it, and the topic ceilings, because archiving is not a refund.
 */
export const NOT_ARCHIVED = { archivedAt: null } as const;
