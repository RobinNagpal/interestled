import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { ScryptOptions } from "node:crypto";

/**
 * promisify picks scrypt's 3-argument overload, which loses the cost
 * parameters, so the options form is wrapped by hand.
 */
function scrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, key) => {
      if (error === null) {
        resolve(key);
      } else {
        reject(error);
      }
    });
  });
}

/** OWASP's floor for scrypt at the time of writing. Encoded per hash so these can rise later. */
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
/**
 * scrypt needs ~128 * N * r bytes, which at these parameters is just over
 * Node's 32 MB default and fails with "memory limit exceeded". Doubling it
 * gives headroom for raising N later.
 */
const MAX_MEM = 128 * N * R * 2;

/**
 * scrypt from node:crypto rather than argon2 from npm: it is memory-hard, needs
 * no native build step (which the Lambda bundle would otherwise have to ship),
 * and the parameters live in the hash so they can be raised without a migration.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAX_MEM });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  const [scheme, n, r, p, salt, hash] = parts;
  if (parts.length !== 6 || scheme !== "scrypt" || salt === undefined || hash === undefined) {
    return false;
  }
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(password, Buffer.from(salt, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    // Derived from the stored parameters, so an older hash with smaller costs
    // still verifies after N is raised.
    maxmem: 128 * Number(n) * Number(r) * 2,
  });
  // Lengths must match before timingSafeEqual, which throws on a mismatch.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
