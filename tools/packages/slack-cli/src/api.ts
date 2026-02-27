import { slackFetch, type SlackClientOpt } from "./slack-fetch.js";
import type {
  ConversationsHistoryParams,
  ConversationsListParams,
  ChatPostMessageParams,
} from "./schemas.js";
import {
  safeParseSearchMessagesParams,
  safeParseConversationsHistoryParams,
  safeParseConversationsListParams,
  safeParseChatPostMessageParams,
  userTokenSchema,
  botTokenSchema,
} from "./schemas.js";

export type { SlackClientOpt };

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
async function searchMessages(
  baseUrl: string,
  token: string,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const auth = await authTest(baseUrl, token);
  const parsed = safeParseSearchMessagesParams(params);
  const team_id = parsed.team_id ?? auth.team_id;
  return slackFetch("/search.messages", {
    query: { ...parsed, team_id },
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
    listConversations: (params: ConversationsListParams) =>
      conversationsList(baseUrl, token, params),
    postMessage: (params: ChatPostMessageParams) =>
      chatPostMessage(baseUrl, token, params),
    getChannelHistory: (params: ConversationsHistoryParams) =>
      conversationsHistory(baseUrl, token, params),
  };
}

/** User Token 用クライアント。search（search:read）を含む。token には xoxp-... を渡す。 */
export function slackUserClient(opt: SlackClientOpt) {
  const token = userTokenSchema.parse(opt.token);
  const { baseUrl } = opt;
  const base = createBaseClient(baseUrl, token);
  return {
    ...base,
    /** 任意のクエリで search.messages を実行。search:read が必要。引数は Zod の safeParse で検証する。 */
    search: (opts: Record<string, unknown>) =>
      searchMessages(baseUrl, token, opts),
  };
}

/** Bot Token 用クライアント。token には xoxb-... を渡す。
 * getMentionsToBot で Bot へのメンションを conversations.list + history から収集する。 */
export function slackBotClient(opt: SlackClientOpt) {
  const token = botTokenSchema.parse(opt.token);
  const { baseUrl } = opt;
  return createBaseClient(baseUrl, token);
}
