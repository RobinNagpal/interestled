import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import type {
  AttemptInputT,
  CardSettingsT,
  DrillKind,
  DrillT,
  LearningNodeT,
  MoveDirection,
  NodeStatus,
  ProfileT,
  ProfileUpdateInputT,
  ReviewInputT,
  TopicContentSettingsInputT,
  TopicContentSettingsT,
  TopicCreateInputT,
  TopicInfoInputT,
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
 * How the topic is written. The server drops the cards it has already generated
 * for this topic, so every cached card here is stale the moment this returns —
 * hence the whole card key, not just this topic's.
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
