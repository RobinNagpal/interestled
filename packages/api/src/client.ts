import { z } from "zod";
import {
  Atom,
  AuthResult,
  CardContent,
  CardDepth,
  Drill,
  LearningNode,
  NodeStatusSchema,
  ResumePoint,
  StudySession,
  Topic,
  User,
  Verdict,
} from "@interestled/schemas";
import type {
  AtomT,
  AttemptInputT,
  CardDepthT,
  DepthAction,
  DrillKind,
  DrillT,
  LearningNodeT,
  LoginInputT,
  NodeStatus,
  RegisterInputT,
  ReviewInputT,
  TopicCreateInputT,
  TopicT,
} from "@interestled/schemas";

export interface ClientConfig {
  /** API origin, no trailing slash. */
  baseUrl: string;
  getToken: () => string | null;
  /** Called on any 401 so the app can drop a session the server has forgotten. */
  onUnauthorized?: () => void;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const ErrorBody = z.object({ error: z.string() });

/** Sends the request and throws on anything that is not a 2xx. */
async function send(
  config: ClientConfig,
  path: string,
  method: string,
  body?: object,
): Promise<Response> {
  const token = config.getToken();
  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (response.status === 401) {
    config.onUnauthorized?.();
  }
  if (!response.ok) {
    const parsed = ErrorBody.safeParse(await response.json().catch(() => null));
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data.error : `Request failed (${response.status})`,
    );
  }
  return response;
}

/** A call whose body is parsed. */
async function request<T>(
  config: ClientConfig,
  path: string,
  method: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  body?: object,
): Promise<T> {
  return schema.parse(await (await send(config, path, method, body)).json());
}

/**
 * A call with no response body. Separate from request rather than passing a
 * null schema, which would need a cast to produce a T out of nothing.
 */
async function requestVoid(
  config: ClientConfig,
  path: string,
  method: string,
  body?: object,
): Promise<void> {
  await send(config, path, method, body);
}

const Progress = z.object({
  total: z.number(),
  earned: z.number(),
  shaky: z.number(),
  capabilities: z.array(z.string()),
  remainingMinutes: z.number(),
});

const NodeRef = z.object({ id: z.string(), title: z.string(), minutes: z.number() });

export const TopicDetail = z.object({
  topic: Topic,
  nodes: z.array(LearningNode),
  progress: Progress,
  resume: ResumePoint.nullable(),
});

export const CardView = z.object({
  node: LearningNode,
  depth: CardDepth,
  variant: z.string(),
  content: CardContent,
  missingPrerequisites: z.array(NodeRef),
});

export const AttemptResult = z.object({
  // Verdict, not z.custom: a custom schema with no validator accepts anything,
  // which is the one thing parsing at the boundary is supposed to prevent.
  attempt: z.object({ id: z.string(), verdict: Verdict }),
  status: NodeStatusSchema,
  capability: z.string(),
});

export const ReviewBatch = z.object({ atoms: z.array(Atom), dueCount: z.number() });

export const SessionPlan = z.object({
  session: StudySession,
  contract: z.string(),
  steps: z.array(z.object({ kind: z.string(), nodeId: z.string(), minutes: z.number() })),
});

export const SessionSummaryView = z.object({
  session: StudySession,
  capabilities: z.array(z.string()),
  gotWrong: z.array(z.string()),
  nextNodes: z.array(NodeRef),
});

export type TopicDetailT = z.infer<typeof TopicDetail>;
export type CardViewT = z.infer<typeof CardView>;
export type AttemptResultT = z.infer<typeof AttemptResult>;
export type ReviewBatchT = z.infer<typeof ReviewBatch>;
export type SessionPlanT = z.infer<typeof SessionPlan>;
export type SessionSummaryViewT = z.infer<typeof SessionSummaryView>;

/** Every call the app can make. One place, so the surface stays visible. */
export interface ApiClient {
  register(input: RegisterInputT): Promise<z.infer<typeof AuthResult>>;
  login(input: LoginInputT): Promise<z.infer<typeof AuthResult>>;
  logout(): Promise<void>;
  me(): Promise<z.infer<typeof User>>;

  listTopics(): Promise<TopicT[]>;
  createTopic(input: TopicCreateInputT): Promise<TopicT>;
  getTopic(id: string): Promise<TopicDetailT>;
  retryTopic(id: string): Promise<TopicT>;
  deleteTopic(id: string): Promise<void>;

  getCard(nodeId: string, options?: { depth?: CardDepthT; action?: DepthAction }): Promise<CardViewT>;
  getDrill(nodeId: string, kind?: DrillKind): Promise<DrillT>;
  submitAttempt(input: AttemptInputT): Promise<AttemptResultT>;
  setNodeStatus(nodeId: string, status: NodeStatus): Promise<LearningNodeT>;

  getReview(): Promise<ReviewBatchT>;
  gradeReview(input: ReviewInputT): Promise<void>;

  startSession(topicId: string, minutes: number): Promise<SessionPlanT>;
  endSession(sessionId: string): Promise<SessionSummaryViewT>;
  saveResume(input: {
    topicId: string;
    nodeId: string;
    drillId: string | null;
    draft: string;
    lastThought: string;
  }): Promise<void>;
}

export function createApiClient(config: ClientConfig): ApiClient {
  const get = <T>(path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> =>
    request(config, path, "GET", schema);
  const post = <T>(
    path: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    body?: object,
  ): Promise<T> => request(config, path, "POST", schema, body);

  return {
    register: (input) => post("/api/auth/register", AuthResult, input),
    login: (input) => post("/api/auth/login", AuthResult, input),
    logout: () => requestVoid(config, "/api/auth/session/logout", "POST"),
    me: () => get("/api/auth/session/me", User),

    listTopics: () => get("/api/topics", z.array(Topic)),
    createTopic: (input) => post("/api/topics", Topic, input),
    getTopic: (id) => get(`/api/topics/${id}`, TopicDetail),
    retryTopic: (id) => post(`/api/topics/${id}/retry`, Topic),
    deleteTopic: (id) => requestVoid(config, `/api/topics/${id}`, "DELETE"),

    getCard: (nodeId, options) => {
      const query = new URLSearchParams();
      if (options?.depth !== undefined) {
        query.set("depth", String(options.depth));
      }
      if (options?.action !== undefined) {
        query.set("action", options.action);
      }
      const suffix = query.toString() === "" ? "" : `?${query.toString()}`;
      return get(`/api/nodes/${nodeId}/card${suffix}`, CardView);
    },
    getDrill: (nodeId, kind) =>
      get(`/api/nodes/${nodeId}/drill${kind === undefined ? "" : `?kind=${kind}`}`, Drill),
    submitAttempt: (input) => post("/api/nodes/attempts", AttemptResult, input),
    setNodeStatus: (nodeId, status) =>
      request(config, `/api/nodes/${nodeId}/status`, "PUT", LearningNode, { status }),

    getReview: () => get("/api/review", ReviewBatch),
    gradeReview: (input) => requestVoid(config, "/api/review", "POST", input),

    startSession: (topicId, minutes) => post("/api/sessions", SessionPlan, { topicId, minutes }),
    endSession: (sessionId) => post(`/api/sessions/${sessionId}/end`, SessionSummaryView),
    saveResume: (input) => requestVoid(config, "/api/sessions/resume", "PUT", input),
  };
}

export type { AtomT, DrillT, LearningNodeT, TopicT };
