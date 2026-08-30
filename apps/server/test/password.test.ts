import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/password";

describe("password", () => {
  it("accepts the right password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batter", stored)).toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    expect(await hashPassword("same input")).not.toBe(await hashPassword("same input"));
  });

  it("records its cost parameters so they can be raised later", async () => {
    const [scheme, n, r, p] = (await hashPassword("x")).split("$");
    expect([scheme, n, r, p]).toEqual(["scrypt", "32768", "8", "1"]);
  });

  it("rejects a malformed stored hash instead of throwing", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "scrypt$1$2")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$32768$8$1$aa$bb")).toBe(false);
  });
});
