import { NodeStatus, joinPath, newId, uniqueSlug } from "@interestled/schemas";
import type { GeneratedMapNodeT, LearningNodeT, TopicT } from "@interestled/schemas";
import { summarise } from "@interestled/domain";
import type { Db } from "./db";
import { toNode, toResumePoint } from "./rows";

/** A learning_nodes row, ready to insert. */
export interface PreparedNode {
  id: string;
  topicId: string;
  parentId: string | null;
  path: string;
  title: string;
  claim: string;
  minutes: number;
  archetype: string;
  orderIndex: number;
  status: NodeStatus;
  capability: string;
}

export interface PreparedEdge {
  nodeId: string;
  prerequisiteId: string;
}

export interface PrepareInput {
  topicId: string;
  archetype: string;
  /** Parents before children — which is the order the flatten functions produce. */
  generated: readonly GeneratedMapNodeT[];
  /** The row these hang under, or null when this is a whole map. */
  parentId: string | null;
  parentPath: string | null;
  /** Slugs already in use beside the new top-level nodes. */
  takenSlugs: ReadonlySet<string>;
  /** Where the new top-level nodes start among their siblings. */
  firstOrderIndex: number;
}

/**
 * Generated nodes as rows: an id per key, a slug per title that is unique among
 * its siblings, and a path built from the parent's. Slugs are assigned here
 * rather than by the model because uniqueness is a property of the set, and a
 * model asked for unique slugs will occasionally return two of the same.
 */
export function prepareNodes(input: PrepareInput): { rows: PreparedNode[]; edges: PreparedEdge[] } {
  const ids = new Map(input.generated.map((node) => [node.key, newId()]));
  const pathByKey = new Map<string, string>();
  // Keyed by the generated parentKey, so each group numbers and slugs its own
  // children. The null bucket starts from what already exists beside them.
  const takenByParent = new Map<string | null, Set<string>>([[null, new Set(input.takenSlugs)]]);
  const nextIndexByParent = new Map<string | null, number>([[null, input.firstOrderIndex]]);
  const rows: PreparedNode[] = [];

  for (const node of input.generated) {
    // A parentKey the model invented would otherwise produce an orphan with no
    // path at all; attaching it at the top keeps it visible and editable.
    const parentKey = node.parentKey !== null && ids.has(node.parentKey) ? node.parentKey : null;
    const parentPath = parentKey === null ? input.parentPath : pathByKey.get(parentKey) ?? null;
    const taken = takenByParent.get(parentKey) ?? new Set<string>();
    const slug = uniqueSlug(node.title, taken);
    taken.add(slug);
    takenByParent.set(parentKey, taken);
    const orderIndex = nextIndexByParent.get(parentKey) ?? 0;
    nextIndexByParent.set(parentKey, orderIndex + 1);

    const path = joinPath(parentPath, slug);
    pathByKey.set(node.key, path);
    rows.push({
      id: ids.get(node.key)!,
      topicId: input.topicId,
      parentId: parentKey === null ? input.parentId : ids.get(parentKey)!,
      path,
      title: node.title,
      claim: node.claim,
      minutes: node.minutes,
      archetype: input.archetype,
      orderIndex,
      status: NodeStatus.Untouched,
      capability: node.capability,
    });
  }

  const edges = input.generated.flatMap((node) =>
    node.prerequisiteKeys
      // A model sometimes names a key it did not create; drop rather than fail.
      .filter((key) => ids.has(key) && key !== node.key)
      .map((key) => ({ nodeId: ids.get(node.key)!, prerequisiteId: ids.get(key)! })),
  );
  return { rows, edges };
}

/**
 * Insert prepared rows shallowest first. parent_id points at another row in the
 * same batch, and doing it a level at a time means the parent is committed
 * before anything references it however the driver chooses to split the insert.
 */
export async function insertNodes(db: Db, rows: readonly PreparedNode[]): Promise<void> {
  const byDepth = new Map<number, PreparedNode[]>();
  for (const row of rows) {
    const depth = row.path.split("/").length;
    byDepth.set(depth, [...(byDepth.get(depth) ?? []), row]);
  }
  for (const depth of [...byDepth.keys()].sort((a, b) => a - b)) {
    await db.learningNode.createMany({ data: byDepth.get(depth) ?? [] });
  }
}

export interface TopicDetail {
  topic: TopicT;
  nodes: LearningNodeT[];
  progress: ReturnType<typeof summarise>;
  resume: ReturnType<typeof toResumePoint> | null;
}

/**
 * The map, its progress, and the restore point — everything the topic screen and
 * the edit screen need, in one call. Every edit answers with this, so a move or a
 * delete leaves the client holding the whole new truth rather than a fragment of
 * it plus a refetch.
 */
export async function loadTopicDetail(db: Db, userId: string, topic: TopicT): Promise<TopicDetail> {
  const [rows, resume] = await Promise.all([
    db.learningNode.findMany({
      where: { topicId: topic.id },
      include: { prerequisites: { select: { prerequisiteId: true } } },
      orderBy: { orderIndex: "asc" },
    }),
    db.resumePoint.findUnique({ where: { userId_topicId: { userId, topicId: topic.id } } }),
  ]);
  const nodes = rows.map(toNode);
  return {
    topic,
    nodes,
    progress: summarise(nodes),
    resume: resume === null ? null : toResumePoint(resume),
  };
}
