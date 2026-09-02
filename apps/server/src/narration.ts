import {
  CardContent,
  NARRATION_VOICE,
  cardVariant,
  narrationKey,
  newId,
  parseCardVariant,
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
import { ConflictError, NotFoundError } from "./errors";
import { generateNarration } from "./llm";
import type { LlmProvider, SpeechProvider } from "./llm";
import { AUDIO_URL_TTL_SECONDS } from "./storage";
import type { ObjectStore } from "./storage";

/** What a WAV is served as. The bucket stores it; the player reads it back. */
const AUDIO_CONTENT_TYPE = "audio/wav";

/**
 * The card a recording is of: the newest one the node has, whatever settings it
 * was written to.
 *
 * The same rule CardLookup.Written follows, and for the same reason — it is the
 * card on the screen the play button is on. Deliberately never writes one: a
 * press of play must not be able to trigger a card generation through a side
 * door, and a node with no card is a node nobody has opened.
 *
 * Null for a row from an earlier card prompt revision, which is what bumping
 * CARD_PROMPT_REVISION means: a card that cannot say what it was written to
 * cannot be narrated at settings anybody could name.
 */
async function narratedCard(
  db: Db,
  nodeId: string,
): Promise<{ id: string; content: CardContentT; settings: CardSettingsT } | null> {
  const row = await db.conceptCard.findFirst({
    where: { nodeId },
    orderBy: { createdAt: "desc" },
  });
  if (row === null) {
    return null;
  }
  const settings = parseCardVariant(row.variant, row.depth, row.instructions);
  // Parsed here rather than at the one call site that reads it: `content` is a
  // Json column, which is the one thing Prisma cannot describe the shape of, so
  // this is the boundary where an unrecognised row has to fail loudly.
  return settings === null
    ? null
    : { id: row.id, content: CardContent.parse(row.content), settings };
}

/**
 * Where this learner's recording of this card belongs in the bucket.
 *
 * Built rather than remembered, so it can be compared against the key a stored
 * row was written to: they differ exactly when NARRATION_PROMPT_REVISION has
 * moved, which is how a rewritten narration.md retires every recording without
 * a migration and without deleting anything.
 */
async function keyFor(
  db: Db,
  userId: string,
  topic: TopicT,
  node: LearningNodeT,
  settings: CardSettingsT,
): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { slug: true } });
  if (user === null) {
    throw new NotFoundError("Account not found");
  }
  return narrationKey({
    userSlug: user.slug,
    topicSlug: topic.slug,
    nodePath: node.path,
    depth: settings.depth,
    variant: cardVariant(settings),
  });
}

/** A stored row as the app sees it: somewhere to play from, and for how long. */
async function playable(
  store: ObjectStore,
  row: { objectKey: string; seconds: number; voice: string },
): Promise<NodeAudioT> {
  return {
    url: await store.signedUrl(row.objectKey, AUDIO_URL_TTL_SECONDS),
    expiresAt: new Date(Date.now() + AUDIO_URL_TTL_SECONDS * 1000),
    seconds: row.seconds,
    voice: row.voice,
  };
}

/**
 * The recording of the card on screen, if there is one. Costs two queries and a
 * signature — no model call, no synthesis, and nothing written.
 *
 * Answers null rather than an error for every kind of absence: no card yet, no
 * recording yet, or one made under an older narration prompt. All three mean
 * the same thing to the button, which is that pressing it will make one.
 */
export async function readNarration(
  db: Db,
  store: ObjectStore,
  userId: string,
  topic: TopicT,
  node: LearningNodeT,
): Promise<NodeAudioT | null> {
  const card = await narratedCard(db, node.id);
  if (card === null) {
    return null;
  }
  const row = await db.cardNarration.findUnique({ where: { cardId: card.id } });
  if (row === null) {
    return null;
  }
  const expected = await keyFor(db, userId, topic, node, card.settings);
  return row.objectKey === expected ? playable(store, row) : null;
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
 * one right after it, finds the row already at the key it would write and
 * answers with it rather than paying for the same card twice.
 */
export async function writeNarration(
  db: Db,
  provider: LlmProvider,
  speech: SpeechProvider,
  store: ObjectStore,
  userId: string,
  topic: TopicT,
  node: LearningNodeT,
): Promise<NodeAudioT> {
  const card = await narratedCard(db, node.id);
  if (card === null) {
    // Never generates one: the button lives on a card, so a node with none is a
    // node this request has no business writing.
    throw new ConflictError("Open this card first — there is nothing to read out yet.");
  }
  const key = await keyFor(db, userId, topic, node, card.settings);
  const existing = await db.cardNarration.findUnique({ where: { cardId: card.id } });
  if (existing !== null && existing.objectKey === key) {
    return playable(store, existing);
  }

  const { script } = await generateNarration(provider, {
    topic,
    node,
    card: card.content,
    settings: card.settings,
  });
  const spoken = await speech.speak({ text: script, voice: NARRATION_VOICE });
  const rate = sampleRateOf(spoken.mimeType);
  const wav = pcmToWav(spoken.audio, rate);

  // The object first, the row second. The other order leaves a row pointing at
  // nothing, which the player meets as a broken link; this order can leave an
  // object nothing points at, which nobody meets at all and the next press
  // overwrites.
  await store.put(key, wav, AUDIO_CONTENT_TYPE);
  const row = {
    script,
    objectKey: key,
    seconds: pcmSeconds(spoken.audio.length, rate),
    bytes: wav.length,
    voice: NARRATION_VOICE,
  };
  const saved = await db.cardNarration.upsert({
    where: { cardId: card.id },
    create: { id: newId(), cardId: card.id, ...row },
    // createdAt moves with the content, because it is what the budget counts and
    // a row keeping its original date is a recording the ceiling never sees.
    update: { ...row, createdAt: new Date() },
  });
  return playable(store, saved);
}
