import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "./env";
import { GenerationError } from "./errors";

/**
 * How long a link to a recording stays good.
 *
 * Long enough to listen to a card and come back to it, short enough that a URL
 * copied out of a network log is not a permanent handle on somebody's material.
 * The app mints a new one every time it asks for the audio, which is every
 * mount and every return to the foreground, so the expiry is never something a
 * learner meets.
 */
export const AUDIO_URL_TTL_SECONDS = 60 * 60;

/**
 * What the audio half of the product needs from a bucket, and nothing else.
 *
 * An interface rather than an S3Client passed around, for the same reason
 * LlmProvider is one: it is the seam a test stops at. Nothing in the test suite
 * should need credentials, a network, or a bucket that exists.
 */
export interface ObjectStore {
  /** Writes, replacing whatever was at that key. */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** A link that works for `seconds` and then does not. */
  signedUrl(key: string, seconds: number): Promise<string>;
}

export interface S3StoreOptions {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function createS3Store(options: S3StoreOptions): ObjectStore {
  const client = new S3Client({
    region: options.region,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
    signedUrl(key, seconds) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: options.bucket, Key: key }), {
        expiresIn: seconds,
      });
    },
  };
}

/**
 * One thing the store cannot be built without.
 *
 * Named individually rather than checked as a group, because "audio is not set
 * up" is not something anybody can act on and "AUDIO_BUCKET is not set" is.
 */
function required(name: string, value: string | undefined): string {
  if (value === undefined) {
    throw new GenerationError(
      `Reading cards aloud is not set up on this deployment — ${name} is not set`,
    );
  }
  return value;
}

/**
 * The store this deployment writes to, built from the environment.
 *
 * Everything it needs is optional in env.ts, because a deployment that has not
 * set any of it is one with the play button turned off rather than one that is
 * broken: nothing else in the product touches S3, so the only thing that fails
 * is the press, and it fails with a sentence naming what is missing. That is
 * the same bargain GEMINI_API_KEY strikes, and the same reason this is built on
 * the first request rather than at start-up.
 */
export function createObjectStore(): ObjectStore {
  const env = getEnv();
  return createS3Store({
    bucket: required("AUDIO_BUCKET", env.AUDIO_BUCKET),
    region: env.AWS_REGION,
    accessKeyId: required("AWS_ACCESS_KEY_ID", env.AWS_ACCESS_KEY_ID),
    secretAccessKey: required("AWS_SECRET_ACCESS_KEY", env.AWS_SECRET_ACCESS_KEY),
  });
}
