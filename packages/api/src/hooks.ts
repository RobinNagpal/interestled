import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import type {
  AttemptInputT,
  CardDepthT,
  DepthAction,
  DrillKind,
  DrillT,
  LearningNodeT,
  NodeStatus,
  ReviewInputT,
  TopicCreateInputT,
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

export function useTopics(): UseQueryResult<TopicT[]> {
  const api = useApi();
  return useQuery({ queryKey: keys.topics, queryFn: () => api.listTopics() });
}

export function useTopic(id: string): UseQueryResult<TopicDetailT> {
  const api = useApi();
  return useQuery({ queryKey: keys.topic(id), queryFn: () => api.getTopic(id), enabled: id !== "" });
}

export function useCreateTopic(): UseMutationResult<TopicT, Error, TopicCreateInputT> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TopicCreateInputT) => api.createTopic(input),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.topics }),
  });
}

export function useRetryTopic(): UseMutationResult<TopicT, Error, string> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.retryTopic(id),
    onSuccess: (topic) => {
      void client.invalidateQueries({ queryKey: keys.topics });
      void client.invalidateQueries({ queryKey: keys.topic(topic.id) });
    },
  });
}

export function useCard(
  nodeId: string,
  options: { depth?: CardDepthT; action?: DepthAction } = {},
): UseQueryResult<CardViewT> {
  const api = useApi();
  return useQuery({
    queryKey: keys.card(nodeId, options.depth ?? null, options.action ?? null),
    queryFn: () => api.getCard(nodeId, options),
    enabled: nodeId !== "",
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

export function useSubmitAttempt(topicId: string): UseMutationResult<AttemptResultT, Error, AttemptInputT> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AttemptInputT) => api.submitAttempt(input),
    // The node's status has moved, so the map is now stale.
    onSuccess: () => client.invalidateQueries({ queryKey: keys.topic(topicId) }),
  });
}

export function useSetNodeStatus(
  topicId: string,
): UseMutationResult<LearningNodeT, Error, { nodeId: string; status: NodeStatus }> {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, status }: { nodeId: string; status: NodeStatus }) =>
      api.setNodeStatus(nodeId, status),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.topic(topicId) }),
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
