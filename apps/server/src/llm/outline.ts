import { buildTree } from "@interestled/domain";
import type { NodeTreeT } from "@interestled/domain";
import type { LearningNodeT } from "@interestled/schemas";

/** What marks the node being written, so the model can see what is around it. */
const HERE = "  ← WRITE THIS ONE";

/**
 * The whole map as headings, in reading order, with one node marked.
 *
 * A card written from its own title and claim alone has no idea what the three
 * nodes before it already said, so it re-explains them, and no idea what the
 * three after it are for, so it pre-empts them. The map is the only thing that
 * knows the order, and it costs a few hundred tokens to say it — every area,
 * every group, every node title, indented by level.
 *
 * The shape falls out of the tree rather than out of the level count, so a
 * two-level map produces two levels of indent and a three-level one produces
 * three, with nothing here having to ask which it is.
 */
export function mapOutline(nodes: readonly LearningNodeT[], current: LearningNodeT): string {
  const lines: string[] = [];
  const walk = (entries: readonly NodeTreeT[], depth: number): void => {
    for (const entry of entries) {
      const mark = entry.node.id === current.id ? HERE : "";
      lines.push(`${"  ".repeat(depth)}- ${entry.node.title}${mark}`);
      walk(entry.children, depth + 1);
    }
  };
  walk(buildTree(nodes), 0);
  // A node that is not in the list it is being placed in would leave the marker
  // missing, and an unmarked outline is worse than none: the model would have to
  // guess which of thirty titles it is writing.
  if (!nodes.some((node) => node.id === current.id)) {
    lines.push(`- ${current.title}${HERE}`);
  }
  return lines.join("\n");
}
