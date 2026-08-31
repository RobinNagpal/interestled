import { z } from "zod";

/**
 * How the learner wants to be taught. A fixed set, so it is an enum with a
 * z.nativeEnum beside it and a plain string column behind it — adding a style
 * is a one-line change with no migration.
 *
 * These are shapes of explanation rather than the "visual/auditory/kinesthetic"
 * learning-styles myth: each one names something a generated card can actually
 * do differently, which is the only reason to ask at all.
 */
export enum LearningStyle {
  Examples = "examples",
  Analogies = "analogies",
  Visuals = "visuals",
  HandsOn = "hands_on",
  StepByStep = "step_by_step",
  BigPicture = "big_picture",
  Stories = "stories",
  Numbers = "numbers",
}

export const LearningStyleSchema = z.nativeEnum(LearningStyle);

/** Every style, in the order the chips are shown. */
export const LEARNING_STYLES: readonly LearningStyle[] = Object.values(LearningStyle);

/** Chip labels. One place, so the form and anything else reading them agree. */
export const LEARNING_STYLE_LABELS: Record<LearningStyle, string> = {
  [LearningStyle.Examples]: "Worked examples",
  [LearningStyle.Analogies]: "Analogies",
  [LearningStyle.Visuals]: "Diagrams",
  [LearningStyle.HandsOn]: "Hands on",
  [LearningStyle.StepByStep]: "Step by step",
  [LearningStyle.BigPicture]: "Big picture first",
  [LearningStyle.Stories]: "Stories",
  [LearningStyle.Numbers]: "Numbers and data",
};

/**
 * Age sets vocabulary and which comparisons land, so it is worth asking once.
 * Null is a real answer — the profile is optional in every field, because a
 * required form before the first topic is exactly the setup cost A14 bans.
 */
export const Age = z.number().int().min(5).max(120);

export const Profile = z.object({
  age: Age.nullable(),
  /** What they already know at a high level, in their own words. 2-3 points. */
  background: z.string(),
  learningStyles: z.array(LearningStyleSchema),
});

export const ProfileUpdateInput = z.object({
  age: Age.nullable().default(null),
  background: z.string().trim().max(600).default(""),
  learningStyles: z
    .array(LearningStyleSchema)
    .max(LEARNING_STYLES.length)
    // A repeated style would be sent to the model twice and would render as two
    // identical selected chips; the set is small enough that deduping is free.
    .transform((styles) => [...new Set(styles)])
    .default([]),
});

export type ProfileT = z.infer<typeof Profile>;
export type ProfileUpdateInputT = z.infer<typeof ProfileUpdateInput>;
