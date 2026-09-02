import { describe, expect, it } from "vitest";
import { CardAngle, ContentFormat, EnglishLevel, LearningNode, NodeStatus, ParagraphLength, TechnicalDetail, TopicArchetype } from "@interestled/schemas";
import { CardView } from "../src/client";

/**
 * The web app reaches CloudFront before the API restarts.
 *
 * The deploy syncs the static export to S3 and invalidates the CDN, and only
 * then runs the migrations and restarts the service — so for those seconds the
 * new app is parsing responses written by the old one. A field added to a
 * response and made required is therefore not a new field: it is every screen
 * that reads that response failing at once, for everybody, until the API comes
 * back. The persisted cache cannot soften it either, because a response shape
 * change is exactly when PERSISTED_CACHE_VERSION throws that cache away.
 *
 * Both fields below were added in the change that made regeneration manual.
 * They are pinned here rather than trusted to review, because the failure they
 * cause is invisible until the ninety seconds it happens in.
 */
describe("a response from an API that predates the client", () => {
  const node = {
    id: "n1",
    topicId: "t1",
    parentId: null,
    slug: "restarts",
    path: "pods/restarts",
    depth: 2,
    title: "Restarts and probes",
    claim: "A probe decides whether a container is healthy.",
    minutes: 3,
    archetype: TopicArchetype.Tool,
    orderIndex: 1,
    status: NodeStatus.Seen,
    prerequisiteIds: [],
    capability: "read a probe",
    createdAt: new Date().toISOString(),
  };

  const settings = {
    depth: 2,
    minutes: 3,
    englishLevel: EnglishLevel.Medium,
    technicalDetail: TechnicalDetail.Medium,
    format: ContentFormat.Prose,
    paragraphLength: ParagraphLength.Medium,
    angle: CardAngle.Base,
    instructions: "",
  };

  it("still gives a node, with no instructions asked for on it", () => {
    const parsed = LearningNode.parse(node);
    expect(parsed.cardInstructions).toBe("");
  });

  it("still gives a card, and says nothing has moved under it", () => {
    const parsed = CardView.parse({
      node,
      settings,
      content: { claim: "c", mechanism: [{ heading: "h", body: "b" }], jargon: [] },
      missingPrerequisites: [],
    });
    // Absent rather than guessed at. The screen falls back to what the card was
    // written to, which reads as "nothing has moved" — how it read before any
    // of this existed.
    expect(parsed.defaults).toBeUndefined();
  });
});
