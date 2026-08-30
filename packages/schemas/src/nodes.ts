import { z } from "zod";
import { Id } from "./ids";
import { TopicArchetypeSchema } from "./topics";

/**
 * A node's state on the map. The order here is the order of advancement, and
 * only production can move a node past Seen — reading must never complete one,
 * or the map starts lying (docs/ux/README.md, ideal 1).
 */
export enum NodeStatus {
  Untouched = "untouched",
  Seen = "seen",
  Explained = "explained",
  Verified = "verified",
  Due = "due",
  Shaky = "shaky",
}

export const NodeStatusSchema = z.nativeEnum(NodeStatus);

export const LearningNode = z.object({
  id: Id,
  topicId: Id,
  title: z.string().min(1).max(120),
  /** One sentence answering "what is this, really?". Shown on the map. */
  claim: z.string().min(1).max(300),
  /** Honest estimate. Capped at 5 so nothing on the map looks unfinishable. */
  minutes: z.number().int().min(1).max(5),
  archetype: TopicArchetypeSchema,
  orderIndex: z.number().int().min(0),
  status: NodeStatusSchema,
  /** Advisory only. The UI shows these as a note; it never gates on them. */
  prerequisiteIds: z.array(Id),
  /** What the learner can do once this is verified. Progress is stated in these. */
  capability: z.string().min(1).max(200),
  createdAt: z.coerce.date(),
});

/** What the LLM returns for a whole topic, before ids are assigned. */
export const GeneratedNode = z.object({
  key: z.string().min(1).max(60),
  title: z.string().min(1).max(120),
  claim: z.string().min(1).max(300),
  minutes: z.number().int().min(1).max(5),
  capability: z.string().min(1).max(200),
  prerequisiteKeys: z.array(z.string().min(1).max(60)).max(6),
});

export const GeneratedMap = z.object({
  archetype: TopicArchetypeSchema,
  nodes: z.array(GeneratedNode).min(6).max(40),
});

export type LearningNodeT = z.infer<typeof LearningNode>;
export type GeneratedNodeT = z.infer<typeof GeneratedNode>;
export type GeneratedMapT = z.infer<typeof GeneratedMap>;
