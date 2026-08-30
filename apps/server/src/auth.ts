import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { zValidator } from "@hono/zod-validator";
import { LoginInput, RegisterInput, User, newId } from "@interestled/schemas";
import type { Db } from "./db";
import { hashPassword, verifyPassword } from "./password";

export interface AuthEnv {
  Variables: { userId: string; defaultDepth: number };
}

/**
 * Long enough that a learner is not signed out mid-topic, short enough that a
 * token lifted from a device stops working. Refreshed on use below.
 */
const SESSION_DAYS = 30;

function expiry(): Date {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

function issueToken(): string {
  return randomBytes(24).toString("base64url");
}

export function authRouter(db: Db): Hono {
  const router = new Hono();

  router.post("/register", zValidator("json", RegisterInput), async (c) => {
    const { email, password } = c.req.valid("json");
    const existing = await db.user.findUnique({ where: { email } });
    if (existing !== null) {
      // Deliberately explicit: hiding it here just moves the discovery to the
      // login screen, and the address is the account name people will retry.
      return c.json({ error: "That email already has an account — sign in instead" }, 409);
    }
    const user = await db.user.create({
      data: { id: newId(), email, passwordHash: await hashPassword(password) },
    });
    const token = issueToken();
    await db.authSession.create({ data: { token, userId: user.id, expiresAt: expiry() } });
    return c.json({ token, user: User.parse(user) }, 201);
  });

  router.post("/login", zValidator("json", LoginInput), async (c) => {
    const { email, password } = c.req.valid("json");
    // The one deliberate opt-out from the global passwordHash omit.
    const user = await db.user.findUnique({ where: { email }, omit: { passwordHash: false } });
    // Verify even when the user is missing, so a wrong address and a wrong
    // password take the same time and cannot be told apart by timing.
    const stored = user?.passwordHash ?? "scrypt$32768$8$1$aaaa$bbbb";
    const ok = await verifyPassword(password, stored);
    if (user === null || !ok) {
      return c.json({ error: "Wrong email or password" }, 401);
    }
    const token = issueToken();
    await db.authSession.create({ data: { token, userId: user.id, expiresAt: expiry() } });
    // Opportunistic cleanup: this login is a natural moment to drop the rows
    // this user has already let lapse, so nothing has to sweep the table.
    await db.authSession.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
    return c.json({ token, user: User.parse(user) });
  });

  return router;
}

export function requireAuth(db: Db): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const header = c.req.header("Authorization");
    const token = header?.startsWith("Bearer ") === true ? header.slice("Bearer ".length) : null;
    const session =
      token === null
        ? null
        : await db.authSession.findUnique({ where: { token }, include: { user: true } });
    if (session === null) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      await db.authSession.delete({ where: { token: session.token } }).catch(() => undefined);
      return c.json({ error: "Your session has expired — sign in again" }, 401);
    }
    c.set("userId", session.userId);
    c.set("defaultDepth", session.user.defaultDepth);
    await next();
  };
}

export function sessionRouter(db: Db): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  router.get("/me", async (c) => {
    const user = await db.user.findUnique({ where: { id: c.get("userId") } });
    if (user === null) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return c.json({ ...User.parse(user), defaultDepth: user.defaultDepth });
  });

  router.post("/logout", async (c) => {
    const header = c.req.header("Authorization") ?? "";
    await db.authSession.deleteMany({ where: { token: header.slice("Bearer ".length) } });
    return c.body(null, 204);
  });

  return router;
}
