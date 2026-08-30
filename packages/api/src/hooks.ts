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
} from "@learnloop/schemas";
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

/**
 * The restore point. Fire-and-forget on every keystroke: a failed save must
 * never interrupt typing, and the next keystroke will retry it anyway.
 */
export function useSaveResume(): (input: {
  topicId: string;
  nodeId: string;
  drillId: string | null;
  draft: string;
  lastThought: string;
}) => void {
  const api = useApi();
  return (input) => {
    void api.saveResume(input).catch(() => undefined);
  };
}
