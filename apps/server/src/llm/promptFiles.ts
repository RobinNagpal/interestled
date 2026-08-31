import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Where the .md prompts are.
 *
 * Neither of the usual answers works here. `__dirname` does not exist under the
 * ESM this package runs as in development, and `import.meta.url` comes out
 * `undefined` once esbuild has emitted the CommonJS bundle the service ships as
 * — so no single expression names the directory in both. Instead the places it
 * can be are listed and the one that exists wins, and a test reads every prompt
 * so a wrong path fails the build rather than the first learner.
 *
 * In the bundle the folder sits beside index.js, put there by
 * deployment/scripts/build-server.sh — the same arrangement as the Prisma
 * engine and schema.prisma, for the same reason.
 */
function promptsDir(): string {
  const candidates = [
    // The CommonJS bundle: prompts/ is copied in beside it. Also correct for a
    // CommonJS run inside the repo, where it resolves to src/llm/prompts.
    typeof __dirname === "string" ? path.join(__dirname, "prompts") : null,
    // tsx and vitest, both of which run with apps/server as the directory.
    path.join(process.cwd(), "src", "llm", "prompts"),
    // A run from the repository root.
    path.join(process.cwd(), "apps", "server", "src", "llm", "prompts"),
  ].filter((candidate): candidate is string => candidate !== null);

  const found = candidates.find((candidate) => existsSync(candidate));
  if (found === undefined) {
    throw new Error(`no prompts directory at any of: ${candidates.join(", ")}`);
  }
  return found;
}

/** Read once and kept: the process is long-lived and the files never change under it. */
const cache = new Map<string, string>();

/**
 * One prompt file, by name without the extension. Trailing whitespace goes,
 * because a template ending in a newline leaves a blank line in the middle of
 * whatever composes it.
 */
export function promptFile(name: string): string {
  const cached = cache.get(name);
  if (cached !== undefined) {
    return cached;
  }
  const text = readFileSync(path.join(promptsDir(), `${name}.md`), "utf8").trimEnd();
  cache.set(name, text);
  return text;
}
