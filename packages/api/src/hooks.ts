import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import type {
  AttemptInputT,
  CardQuestionT,
  CardSettingsT,
  DrillKind,
  DrillT,
  LearningNodeT,
  MapPlanViewT,
  MoveDirection,
  NodeStatus,
  ProfileT,
  ProfileUpdateInputT,
  ReviewInputT,
  MapShapeT,
  ParagraphLength,
  TopicContentSettingsInputT,
  TopicContentSettingsT,
  TopicCreateInputT,
  TopicInfoInputT,
  TopicQuestionsInputT,
  TopicRegenerateInputT,
  TopicT,
} from "@interestled/schemas";
import { useApi } from "./context";
import { keys } from "./keys";
import type {
  AttemptResultT,
  CardViewT,
  ReviewBatchT,
  SessionPlanT,
  SessionSummaryViewT,
  TopicDetailT,
} from "./client";

/**
 * The profile feeds every generation call, so it is fetched once and cached
 * under its own key rather than being folded into the user object — editing it
 * must not invalidate the session.
 */
export function useProfile(): UseQueryResult<ProfileT> {
  const api = useApi();
  return useQuery({ queryKey: keys.profile, queryFn: () => api.getProfile() });
}

export function useUpdateProfile(): UseMutationResult<ProfileT, Error, ProfileUpdateInputT> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileUpdateInputT) => api.updateProfile(input),
    onSuccess: (profile) => client.setQueryData(keys.profile, profile),
  });
}

/**
 * The instruction lines a set of shape settings seeds. A mutation rather than a
 * query because it is asked for as the chips move, and a query keyed on five
 * numbers would cache a row per combination anybody ever touched.
 */
export function useSeedMapInstructions(): UseMutationResult<string, Error, MapShapeT> {
  const api = useApi();
  return useMutation({ mutationFn: (shape: MapShapeT) => api.seedMapInstructions(shape) });
}

/** The same, for the lines a card is written to. */
export function useSeedContentInstructions(): UseMutationResult<string, Error, ParagraphLength> {
  const api = useApi();
  return useMutation({
    mutationFn: (paragraphLength: ParagraphLength) => api.seedContentInstructions(paragraphLength),
  });
}

export function useTopics(): UseQueryResult<TopicT[]> {
  const api = useApi();
  return useQuery({ queryKey: keys.topics, queryFn: () => api.listTopics() });
}

export function useTopic(slug: string): UseQueryResult<TopicDetailT> {
  const api = useApi();
  return useQuery({
    queryKey: keys.topic(slug),
    queryFn: () => api.getTopic(slug),
    enabled: slug !== "",
  });
}

/**
 * The seven questions asked before a new topic's map is built. A mutation
 * rather than a query: it is a model call the learner sets off by pressing a
 * button, and nothing should be able to refetch it under them — a refetch would
 * replace the four options they are reading with four different ones.
 */
export function useMapQuestions(): UseMutationResult<MapPlanViewT, Error, TopicCreateInputT> {
  const api = useApi();
  return useMutation({ mutationFn: (input: TopicCreateInputT) => api.mapQuestions(input) });
}

/** The same seven, for a rebuild, generated against the map being replaced. */
export function useTopicMapQuestions(
  slug: string,
): UseMutationResult<MapPlanViewT, Error, TopicQuestionsInputT> {
  const api = useApi();
  return useMutation({
    mutationFn: (input: TopicQuestionsInputT) => api.topicMapQuestions(slug, input),
  });
}

export function useCreateTopic(): UseMutationResult<TopicT, Error, TopicCreateInputT> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TopicCreateInputT) => api.createTopic(input),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.topics }),
  });
}

/**
 * Build the map again, with or without instructions. Also the way out of a
 * failed generation, which is the same operation with nothing said.
 */
export function useRegenerateTopic(
  slug: string,
): UseMutationResult<TopicT, Error, TopicRegenerateInputT> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TopicRegenerateInputT) => api.regenerateTopic(slug, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.topics });
      void client.invalidateQueries({ queryKey: keys.topic(slug) });
    },
  });
}

/**
 * What the topic is and what the learner wants from it. It regenerates nothing —
 * the answers change what the next generation reads, and the map already built
 * keeps every node and every status on it.
 */
export function useUpdateTopicInfo(
  slug: string,
): UseMutationResult<TopicT, Error, TopicInfoInputT> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TopicInfoInputT) => api.updateTopicInfo(slug, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.topics });
      void client.invalidateQueries({ queryKey: keys.topic(slug) });
    },
  });
}

/**
 * How the topic is written. The server keeps the cards it has already written,
 * but answers each of them against the new settings from now on — so every
 * cached card here is stale the moment this returns, and the next open of one
 * has to ask again to learn that the settings have moved. Hence the whole card
 * key, not just this topic's: the keys do not carry the topic.
 */
export function useUpdateTopicContentSettings(
  slug: string,
): UseMutationResult<TopicT, Error, TopicContentSettingsInputT> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TopicContentSettingsInputT) => api.updateTopicContentSettings(slug, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.topics });
      void client.invalidateQueries({ queryKey: keys.topic(slug) });
      void client.invalidateQueries({ queryKey: keys.cards });
    },
  });
}

/** The defaults a topic falls back to. They never change under the app. */
export function useTopicDefaults(): UseQueryResult<TopicContentSettingsT> {
  const api = useApi();
  return useQuery({
    queryKey: keys.topicDefaults,
    queryFn: () => api.getTopicDefaults(),
    staleTime: Infinity,
  });
}

/**
 * The three map edits. Each answers with the whole map, so the result is written
 * straight into the cache — a reorder that refetched would show the old order
 * for as long as the round trip takes, which is exactly long enough to look
 * broken.
 */
function useMapEdit<TVariables>(
  slug: string,
  edit: (variables: TVariables) => Promise<TopicDetailT>,
): UseMutationResult<TopicDetailT, Error, TVariables> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: edit,
    onSuccess: (detail) => client.setQueryData(keys.topic(slug), detail),
  });
}

export function useRegenerateNode(
  slug: string,
): UseMutationResult<TopicDetailT, Error, { nodeId: string; instructions: string }> {
  const api = useApi();
  return useMapEdit(slug, ({ nodeId, instructions }: { nodeId: string; instructions: string }) =>
    api.regenerateNode(slug, nodeId, instructions),
  );
}

export function useMoveNode(
  slug: string,
): UseMutationResult<TopicDetailT, Error, { nodeId: string; direction: MoveDirection }> {
  const api = useApi();
  return useMapEdit(slug, ({ nodeId, direction }: { nodeId: string; direction: MoveDirection }) =>
    api.moveNode(slug, nodeId, direction),
  );
}

export function useDeleteNode(slug: string): UseMutationResult<TopicDetailT, Error, string> {
  const api = useApi();
  return useMapEdit(slug, (nodeId: string) => api.deleteNode(slug, nodeId));
}

/**
 * One card, at whatever settings the controls under it are on.
 *
 * The card already on screen is kept while the next one is written — a rewrite
 * takes ten to thirty seconds, and blanking the screen to a skeleton for that
 * long is what makes the controls feel broken rather than slow. It is kept only
 * for the same node: the reader arriving at a new node must never be shown the
 * last one's card while this one loads.
 */
export function useCard(
  nodeId: string,
  settings: Partial<CardSettingsT> = {},
): UseQueryResult<CardViewT> {
  const api = useApi();
  return useQuery({
    queryKey: keys.card(nodeId, settings),
    queryFn: () => api.getCard(nodeId, settings),
    enabled: nodeId !== "",
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === nodeId ? previous : undefined,
  });
}

/**
 * Write this card again at the settings it already has.
 *
 * A mutation rather than a refetch, because a refetch is what the cache is for:
 * the same key answered from the same row is exactly what this control exists to
 * go around. The result is written back under that key, so the card on screen
 * becomes the new one — and the old one stays up until it lands, since the query
 * behind it is never invalidated.
 */
export function useRewriteCard(
  nodeId: string,
): UseMutationResult<CardViewT, Error, Partial<CardSettingsT>> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<CardSettingsT>) =>
      api.getCard(nodeId, settings, { rewrite: true }),
    // The settings the press actually asked for, not whatever the controls are
    // on when the answer lands: a rewrite runs for ten to thirty seconds, and a
    // control moved while it is in flight would otherwise file the new card
    // under a key it was not written to and overwrite the card that was.
    onSuccess: (card, settings) => client.setQueryData(keys.card(nodeId, settings), card),
  });
}

/**
 * What the learner wants for this node's card in particular. Saved on the node,
 * which is on the map, so the map is refetched; and every card of this node is
 * marked stale without being refetched — the one on screen is about to be
 * written again by the press that saved this, and a refetch racing that write
 * could land after it and put the old card back.
 */
export function useSaveCardInstructions(
  topicSlug: string,
  nodeId: string,
): UseMutationResult<LearningNodeT, Error, string> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (instructions: string) => api.saveCardInstructions(nodeId, instructions),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.topic(topicSlug) });
      void client.invalidateQueries({ queryKey: keys.cardsOf(nodeId), refetchType: "none" });
    },
  });
}

export function useQuestions(nodeId: string): UseQueryResult<CardQuestionT[]> {
  const api = useApi();
  return useQuery({
    queryKey: keys.questions(nodeId),
    queryFn: () => api.listQuestions(nodeId),
    enabled: nodeId !== "",
  });
}

/**
 * Ask one question on a card. The answer is appended to the list on screen as
 * it lands rather than refetched, so the accordion opens on it at once.
 */
export function useAskQuestion(nodeId: string): UseMutationResult<CardQuestionT, Error, string> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (question: string) => api.askQuestion(nodeId, question),
    onSuccess: (answered) =>
      client.setQueryData<CardQuestionT[]>(keys.questions(nodeId), (current) => [
        ...(current ?? []),
        answered,
      ]),
  });
}

export function useDrill(nodeId: string, kind?: DrillKind): UseQueryResult<DrillT> {
  const api = useApi();
  return useQuery({
    queryKey: keys.drill(nodeId, kind ?? null),
    queryFn: () => api.getDrill(nodeId, kind),
    enabled: nodeId !== "",
  });
}

export function useSubmitAttempt(
  topicSlug: string,
): UseMutationResult<AttemptResultT, Error, AttemptInputT> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AttemptInputT) => api.submitAttempt(input),
    // The node's status has moved, so the map is now stale.
    onSuccess: () => client.invalidateQueries({ queryKey: keys.topic(topicSlug) }),
  });
}

export function useSetNodeStatus(
  topicSlug: string,
): UseMutationResult<LearningNodeT, Error, { nodeId: string; status: NodeStatus }> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, status }: { nodeId: string; status: NodeStatus }) =>
      api.setNodeStatus(nodeId, status),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.topic(topicSlug) }),
  });
}

export function useReview(): UseQueryResult<ReviewBatchT> {
  const api = useApi();
  return useQuery({ queryKey: keys.review, queryFn: () => api.getReview() });
}

export function useGradeReview(): UseMutationResult<void, Error, ReviewInputT> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewInputT) => api.gradeReview(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.review });
      // A miss reopens its node, so the map may have changed too.
      void client.invalidateQueries({ queryKey: ["topic"] });
    },
  });
}

export function useStartSession(): UseMutationResult<
  SessionPlanT,
  Error,
  { topicId: string; minutes: number }
> {
  const api = useApi();
  return useMutation({
    mutationFn: ({ topicId, minutes }: { topicId: string; minutes: number }) =>
      api.startSession(topicId, minutes),
  });
}

export function useEndSession(): UseMutationResult<SessionSummaryViewT, Error, string> {
  const api = useApi();
  return useMutation({ mutationFn: (sessionId: string) => api.endSession(sessionId) });
}

export interface ResumeInput {
  topicId: string;
  nodeId: string;
  drillId: string | null;
  draft: string;
  lastThought: string;
}

/** Long enough to collapse a burst of typing, short enough to survive a kill. */
const RESUME_DEBOUNCE_MS = 800;

/**
 * The restore point, saved while typing. Debounced on purpose: writing on every
 * keystroke is one request and one upsert per character, which on a phone is
 * hundreds of round trips per drill. The pending write is flushed on unmount so
 * navigating away still saves, and failures are swallowed because a save must
 * never interrupt typing.
 */
export function useSaveResume(): (input: ResumeInput) => void {
  const api = useApi();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<ResumeInput | null>(null);

  const flush = useCallback((): void => {
    const input = pending.current;
    pending.current = null;
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (input !== null) {
      void api.saveResume(input).catch(() => undefined);
    }
  }, [api]);

  useEffect(() => flush, [flush]);

  return useCallback(
    (input: ResumeInput) => {
      pending.current = input;
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(flush, RESUME_DEBOUNCE_MS);
    },
    [flush],
  );
}
