import {
  CardContent,
  NARRATION_VOICE,
  cardVariant,
  narrationKey,
  newId,
} from "@interestled/schemas";
import type {
  CardContentT,
  CardSettingsT,
  LearningNodeT,
  NodeAudioT,
  TopicT,
} from "@interestled/schemas";
import { pcmSeconds, pcmToWav, sampleRateOf } from "./audio/wav";
import type { Db } from "./db";
import { ConflictError } from "./errors";
import { generateNarration } from "./llm";
import type { LlmProvider, SpeechProvider } from "./llm";
import { AUDIO_URL_TTL_SECONDS } from "./storage";
import type { ObjectStore } from "./storage";
import { assertNarrationBudget } from "./topics";

/** What a WAV is served as. The bucket stores it; the player reads it back. */
const AUDIO_CONTENT_TYPE = "audio/wav";

/** Who is asking, what they are reading, and where the recording belongs. */
export interface NarrationTarget {
  userId: string;
  /** Off the session, not looked up: it never changes and it is already loaded. */
  userSlug: string;
  topic: TopicT;
  node: LearningNodeT;
  /**
   * What the card on screen was written to, as the card route answered it.
   *
   * Named by the caller rather than resolved here as "the newest card this node
   * has". Those are not the same card: moving a chip writes a second card at
   * those settings and moving it back serves the first one again, so the newest
   * row is the one the reader just navigated away from. A recording is of the
   * card the button is on, and this is the only thing that says which that is.
   */
  settings: CardSettingsT;
}

/** The one writing of the card the button sits on, or null if there is none. */
async function cardBeingRead(
  db: Db,
  target: NarrationTarget,
): Promise<{ id: string; content: CardContentT; writtenAt: Date } | null> {
  const row = await db.conceptCard.findUnique({
    where: {
      nodeId_depth_variant: {
        nodeId: target.node.id,
        depth: target.settings.depth,
        variant: cardVariant(target.settings),
      },
    },
  });
  // Parsed here rather than at the call site that reads it: `content` is a Json
  // column, which is the one thing Prisma cannot describe the shape of, so this
  // is the boundary where an unrecognised row has to fail loudly.
  return row === null
    ? null
    : { id: row.id, content: CardContent.parse(row.content), writtenAt: row.createdAt };
}

/**
 * Where this learner's recording of this card belongs in the bucket.
 *
 * Built rather than remembered, so it can be compared against the key a stored
 * row was written to: they differ exactly when NARRATION_PROMPT_REVISION has
 * moved, which is how a rewritten narration.md retires every recording without
 * a migration and without deleting anything.
 */
function keyFor(target: NarrationTarget): string {
  return narrationKey({
    userSlug: target.userSlug,
    topicSlug: target.topic.slug,
    nodePath: target.node.path,
    depth: target.settings.depth,
    variant: cardVariant(target.settings),
  });
}

/** The columns a stored recording has to say whether it is still the right one. */
interface NarrationRow {
  objectKey: string;
  cardWrittenAt: Date;
  seconds: number;
  voice: string;
  createdAt: Date;
}

/**
 * Whether a stored recording is still of the words on the card.
 *
 * Two ways it can stop being: the card was written again, which moves its
 * `createdAt` without changing its id; and NARRATION_PROMPT_REVISION moved,
 * which changes the key the recording would be written to now. Both are answered
 * as "there is no recording", because that is what they mean to the button.
 */
function isCurrent(row: NarrationRow, key: string, cardWrittenAt: Date): boolean {
  return row.objectKey === key && row.cardWrittenAt.getTime() === cardWrittenAt.getTime();
}

/** A stored row as the app sees it: somewhere to play from, and for how long. */
async function playable(store: ObjectStore, row: NarrationRow): Promise<NodeAudioT> {
  return {
    url: await store.signedUrl(row.objectKey, AUDIO_URL_TTL_SECONDS),
    expiresAt: new Date(Date.now() + AUDIO_URL_TTL_SECONDS * 1000),
    seconds: row.seconds,
    voice: row.voice,
    // What identifies this recording to a player that has already loaded one.
    madeAt: row.createdAt,
  };
}

/**
 * The recording of the card on screen, if there is one. Two queries and, only
 * when there is something to point at, one signature — no model call, no
 * synthesis, and nothing written.
 *
 * The store is a factory rather than a store for that last reason: building it
 * needs AUDIO_BUCKET, and a deployment that has not set one is supposed to
 * serve every route and fail only the press. Built eagerly, this route would
 * answer 502 on every card open instead.
 *
 * Null is every kind of "not yet" — no card, no recording, one of a card since
 * rewritten, one from an older narration prompt. They all mean the same thing
 * to the button, which is that pressing it will make one.
 */
export async function readNarration(
  db: Db,
  objects: () => ObjectStore,
  target: NarrationTarget,
): Promise<NodeAudioT | null> {
  const card = await cardBeingRead(db, target);
  if (card === null) {
    return null;
  }
  const row = await db.cardNarration.findUnique({ where: { cardId: card.id } });
  if (row === null || !isCurrent(row, keyFor(target), card.writtenAt)) {
    return null;
  }
  return playable(objects(), row);
}

/**
 * Make the recording, and keep it.
 *
 * Two calls to the provider: the content model turns the card into something
 * worth hearing, and the speech model says it. The script is the cheap half and
 * the synthesis is the expensive one, which is why the row keeps both — a voice
 * changed later is a synthesis, not a re-reading of the card.
 *
 * Idempotent by design: a second press while the first is still in flight, or
 * one right after it, finds the row already current and answers with it rather
 * than paying for the same card twice. That check runs before the budget, so a
 * press that would have cost nothing is never the one refused — including the
 * retry after a slow first press timed out at the edge with the work already
 * done and the row already written.
 */
export async function writeNarration(
  db: Db,
  provider: LlmProvider,
  speech: SpeechProvider,
  objects: () => ObjectStore,
  target: NarrationTarget,
): Promise<NodeAudioT> {
  const card = await cardBeingRead(db, target);
  if (card === null) {
    // Never generates one: the button lives on a card, so a node with none at
    // these settings is a node this request has no business writing.
    throw new ConflictError("Open this card first — there is nothing to read out yet.");
  }
  const key = keyFor(target);
  const existing = await db.cardNarration.findUnique({ where: { cardId: card.id } });
  const store = objects();
  if (existing !== null && isCurrent(existing, key, card.writtenAt)) {
    return playable(store, existing);
  }
  await assertNarrationBudget(db, target.userId);

  const { script } = await generateNarration(provider, {
    topic: target.topic,
    node: target.node,
    card: card.content,
    settings: target.settings,
  });
  const spoken = await speech.speak({ text: script, voice: NARRATION_VOICE });
  const rate = sampleRateOf(spoken.mimeType);
  const wav = pcmToWav(spoken.audio, rate);

  // The object first, the row second. The other order leaves a row pointing at
  // nothing, which the player meets as a broken link; this order can leave an
  // object nothing points at, which nobody meets at all and the next press
  // overwrites — the key is the card's identity, so a re-recording lands on top
  // of what it replaces rather than beside it.
  await store.put(key, wav, AUDIO_CONTENT_TYPE);
  const row = {
    script,
    objectKey: key,
    cardWrittenAt: card.writtenAt,
    seconds: pcmSeconds(spoken.audio.length, rate),
    bytes: wav.length,
    voice: NARRATION_VOICE,
  };
  const saved = await db.cardNarration.upsert({
    where: { cardId: card.id },
    create: { id: newId(), cardId: card.id, ...row },
    // createdAt moves with the content, because it is what the budget counts, a
    // row keeping its original date is a recording the ceiling never sees, and
    // it is what tells a player already holding one that this is a new one.
    update: { ...row, createdAt: new Date() },
  });
  return playable(store, saved);
}
