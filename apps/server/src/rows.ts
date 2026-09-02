import {
  Atom,
  CardQuestion,
  ConceptCard,
  Drill,
  LearningNode,
  Profile,
  ResumePoint,
  StudySession,
  Topic,
  depthOfPath,
  slugOfPath,
} from "@interestled/schemas";
import type {
  AtomT,
  CardQuestionT,
  ConceptCardT,
  DrillT,
  LearningNodeT,
  ProfileT,
  ResumePointT,
  StudySessionT,
  TopicT,
} from "@interestled/schemas";

/**
 * Prisma rows carry plain strings where the app has enums, and Json where it has
 * a shape. Parsing here is what turns an unrecognised value into a loud failure
 * instead of an arbitrary string flowing through the app.
 */

export interface NodeRow {
  id: string;
  topicId: string;
  parentId: string | null;
  path: string;
  title: string;
  claim: string;
  minutes: number;
  archetype: string;
  orderIndex: number;
  status: string;
  capability: string;
  cardInstructions: string;
  createdAt: Date;
  prerequisites?: { prerequisiteId: string }[];
}

/**
 * `slug` and `depth` are derived from `path` rather than stored beside it. Two
 * columns saying the same thing is two chances for an edit to leave them
 * disagreeing, and there is no answer to which one the router should believe.
 */
export function toNode(row: NodeRow): LearningNodeT {
  return LearningNode.parse({
    ...row,
    slug: slugOfPath(row.path),
    depth: depthOfPath(row.path),
    prerequisiteIds: (row.prerequisites ?? []).map((edge) => edge.prerequisiteId),
  });
}

export function toTopic(row: unknown): TopicT {
  return Topic.parse(row);
}

/**
 * The profile is a slice of the user row, so the parse both validates the stored
 * learning styles and drops everything else the row carries.
 */
export function toProfile(row: unknown): ProfileT {
  return Profile.parse(row);
}

export function toCard(row: unknown): ConceptCardT {
  return ConceptCard.parse(row);
}

export function toDrill(row: unknown): DrillT {
  return Drill.parse(row);
}

export function toCardQuestion(row: unknown): CardQuestionT {
  return CardQuestion.parse(row);
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
