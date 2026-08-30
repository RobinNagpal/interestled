import {
  Atom,
  ConceptCard,
  Drill,
  LearningNode,
  ResumePoint,
  StudySession,
  Topic,
} from "@learnloop/schemas";
import type {
  AtomT,
  ConceptCardT,
  DrillT,
  LearningNodeT,
  ResumePointT,
  StudySessionT,
  TopicT,
} from "@learnloop/schemas";

/**
 * Prisma rows carry plain strings where the app has enums, and Json where it has
 * a shape. Parsing here is what turns an unrecognised value into a loud failure
 * instead of an arbitrary string flowing through the app.
 */

export interface NodeRow {
  id: string;
  topicId: string;
  title: string;
  claim: string;
  minutes: number;
  archetype: string;
  orderIndex: number;
  status: string;
  capability: string;
  createdAt: Date;
  prerequisites?: { prerequisiteId: string }[];
}

export function toNode(row: NodeRow): LearningNodeT {
  return LearningNode.parse({
    ...row,
    prerequisiteIds: (row.prerequisites ?? []).map((edge) => edge.prerequisiteId),
  });
}

export function toTopic(row: unknown): TopicT {
  return Topic.parse(row);
}

export function toCard(row: unknown): ConceptCardT {
  return ConceptCard.parse(row);
}

export function toDrill(row: unknown): DrillT {
  return Drill.parse(row);
}

export function toAtom(row: unknown): AtomT {
  return Atom.parse(row);
}

export function toStudySession(row: unknown): StudySessionT {
  return StudySession.parse(row);
}

export function toResumePoint(row: unknown): ResumePointT {
  return ResumePoint.parse(row);
}
