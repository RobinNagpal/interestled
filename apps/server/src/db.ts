import { PrismaClient } from "@prisma/client";

/**
 * The password hash is omitted globally: no query returns it unless a call site
 * explicitly opts back in, which only the login check does.
 */
export type Db = PrismaClient<{ omit: { user: { passwordHash: true } } }>;

export function createDb(): Db {
  return new PrismaClient({ omit: { user: { passwordHash: true } } });
}
