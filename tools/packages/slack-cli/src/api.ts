import type {
  SearchMessagesParams,
  ConversationsHistoryParams,
  ConversationsListParams,
  ChatPostMessageParams,
} from "./schemas.js";
import {
  safeParseSearchMessagesParams,
  safeParseConversationsHistoryParams,
  safeParseConversationsListParams,
  safeParseChatPostMessageParams,
} from "./schemas.js";

const SLACK_USER_TOKEN_PREFIX = "xoxp-";
const SLACK_BOT_TOKEN_PREFIX = "xoxb-";

export type SlackClientOpt = {
  token: string;
  /** Slack API base URL (e.g. https://slack.com/api). */
  baseUrl: string;
};

function assertToken(pattern: string, token: string): void {
  if (!token.startsWith(pattern)) {
    throw new Error(
      `${pattern} で始まるトークンを指定してください（渡された値は "${token.slice(0, 8)}..." です）`,
    );
  }
}

type SlackApiParams = Record<string, string | number | boolean | undefined>;

type SlackApiArgsBase<M extends "GET" | "POST"> = {
  method: M;
  opt: SlackClientOpt;
};

type SlackApiArgsGetBase<T extends string, Q extends object> = [
  T,
  SlackApiArgsBase<"GET"> & { query: Q },
];

type SlackApiArgsPostBase<
  T extends string,
  Q extends { body: object; query?: object } | unknown = unknown,
> = [T, SlackApiArgsBase<"POST"> & Q];

export type SlackApiGetArgs =
  | SlackApiArgsGetBase<"/search.messages", SearchMessagesParams>
  | SlackApiArgsGetBase<"/conversations.history", ConversationsHistoryParams>
  | SlackApiArgsGetBase<"/conversations.list", ConversationsListParams>;

export type SlackApiPostArgs =
  | SlackApiArgsPostBase<"/auth.test">
  | SlackApiArgsPostBase<"/chat.postMessage", { body: ChatPostMessageParams }>;

/** slackFetch の引数型。method + opt と [path, payload] のタプル。 */
export type SlackApiArgs = SlackApiGetArgs | SlackApiPostArgs;
const filterObject = <T>(o: Record<string, T>) =>
  Object.entries(o).reduce(
    (acc, [k, v]) => (v === undefined ? acc : { ...acc, [k]: v }),
    {},
  );
function toQuery(params: SlackApiParams): string {
  const q = new URLSearchParams(filterObject(params)).toString();
  return q ? `?${q}` : "";
}

function getPathAndParams(args: SlackApiArgs): {
  path: string;
  params: SlackApiParams;
} {
  const [path, payload] = args;
  if (payload.method === "GET") {
    return { path, params: payload.query };
  }
  const params = "body" in payload ? payload.body : {};
  return { path, params };
}

async function slackFetch(
  ...args: SlackApiArgs
): Promise<Record<string, unknown>> {
  const { opt, method } = args[1];
  const { baseUrl, token } = opt;
  const { path, params } = getPathAndParams(args);

  const url =
    method === "GET"
      ? `${baseUrl}${path}${toQuery(params)}`
      : `${baseUrl}${path}`;
  const bodyParams = filterObject(params);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    ...(method === "POST" && Object.keys(bodyParams).length > 0
      ? { body: JSON.stringify(bodyParams) }
      : {}),
  });

  const body = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const msg = typeof body.error === "string" ? body.error : res.statusText;
    throw new Error(`Slack API ${res.status}: ${msg}`);
  }

  if (body.ok === false) {
    const msg = typeof body.error === "string" ? body.error : "request failed";
    throw new Error(msg);
  }

  return body;
}

export type AuthTestParams = Record<string, never>;

/** @see https://api.slack.com/methods/auth.test */
function authTest(
  baseUrl: string,
  token: string,
): Promise<{ user_id?: string; team_id?: string }> {
  return slackFetch("/auth.test", {
    method: "POST" as const,
    opt: { baseUrl, token },
  }) as Promise<{ user_id?: string; team_id?: string }>;
}

export type {
  SearchMessagesParams,
  ConversationsHistoryParams,
  ConversationsListParams,
  ChatPostMessageParams,
} from "./schemas.js";

/** @see https://docs.slack.dev/reference/methods/search.messages/ */
function searchMessages(
  baseUrl: string,
  token: string,
  params: SearchMessagesParams,
): Promise<Record<string, unknown>> {
  return slackFetch("/search.messages", {
    query: params,
    method: "GET" as const,
    opt: { baseUrl, token },
  });
}

/** @see https://api.slack.com/methods/conversations.history */
function conversationsHistory(
  baseUrl: string,
  token: string,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const parsed = safeParseConversationsHistoryParams(params);
  return slackFetch("/conversations.history", {
    query: parsed,
    method: "GET" as const,
    opt: { baseUrl, token },
  });
}

/** @see https://api.slack.com/methods/conversations.list */
function channelsList(
  baseUrl: string,
  token: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const parsed = safeParseConversationsListParams({
    limit: 10,
    types: "public_channel,private_channel",
    ...params,
  });
  return slackFetch("/conversations.list", {
    query: parsed,
    method: "GET" as const,
    opt: { baseUrl, token },
  });
}

/** @see https://api.slack.com/methods/conversations.list */
function conversationsList(
  baseUrl: string,
  token: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const parsed = safeParseConversationsListParams({ limit: 10, ...params });
  return slackFetch("/conversations.list", {
    query: parsed,
    method: "GET" as const,
    opt: { baseUrl, token },
  });
}

/** @see https://api.slack.com/methods/chat.postMessage */
function chatPostMessage(
  baseUrl: string,
  token: string,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const parsed = safeParseChatPostMessageParams(params);
  return slackFetch("/chat.postMessage", {
    body: parsed,
    method: "POST" as const,
    opt: { baseUrl, token },
  });
}

function createBaseClient(baseUrl: string, token: string) {
  return {
    listChannels: () => channelsList(baseUrl, token),
    listConversations: () => conversationsList(baseUrl, token),
    postMessage: (channel: string, text: string) =>
      chatPostMessage(baseUrl, token, { channel, text }),
    getChannelHistory: (params: ConversationsHistoryParams) =>
      conversationsHistory(baseUrl, token, params),
  };
}

/** User Token 用クライアント。search（search:read）を含む。token には xoxp-... を渡す。 */
export function slackUserClient(opt: SlackClientOpt) {
  assertToken(SLACK_USER_TOKEN_PREFIX, opt.token);
  const { token, baseUrl } = opt;
  const base = createBaseClient(baseUrl, token);
  return {
    ...base,
    /** 任意のクエリで search.messages を実行。search:read が必要。引数は Zod の safeParse で検証する。 */
    search: async (opts: Record<string, unknown>) => {
      const parsed = safeParseSearchMessagesParams(opts);
      const auth = await authTest(baseUrl, token);
      return searchMessages(baseUrl, token, {
        ...parsed,
        team_id: parsed.team_id ?? auth.team_id,
        cursor: parsed.cursor ?? "*",
      });
    },
  };
}

/** Bot Token 用クライアント。token には xoxb-... を渡す。
 * getMentionsToBot で Bot へのメンションを conversations.list + history から収集する。 */
export function slackBotClient(opt: SlackClientOpt) {
  assertToken(SLACK_BOT_TOKEN_PREFIX, opt.token);
  const { token, baseUrl } = opt;
  return createBaseClient(baseUrl, token);
}
