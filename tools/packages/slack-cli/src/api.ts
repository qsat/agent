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
  safeParseSearchMessagesToBotParams,
  searchMessagesResponseSchema,
  conversationsHistoryResponseSchema,
  conversationsListResponseSchema,
} from "./schemas.js";
import type {
  SearchMessagesResponse,
  ConversationsHistoryResponse,
  ConversationsListResponse,
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
  SearchMessagesResponse,
  ConversationsHistoryParams,
  ConversationsHistoryResponse,
  ConversationsListParams,
  ConversationsListResponse,
  ChatPostMessageParams,
} from "./schemas.js";

/** @see https://docs.slack.dev/reference/methods/search.messages/ */
async function searchMessages(
  baseUrl: string,
  token: string,
  params: Record<string, unknown>,
): Promise<SearchMessagesResponse> {
  const auth = await authTest(baseUrl, token);
  const parsed = safeParseSearchMessagesParams(params);
  const team_id = parsed.team_id ?? auth.team_id;
  const raw = await slackFetch("/search.messages", {
    query: { ...parsed, team_id },
    method: "GET" as const,
    opt: { baseUrl, token },
  });
  return searchMessagesResponseSchema.parse(raw);
}

async function searchMessagesMentionToBot(
  baseUrl: string,
  token: string,
  params: Record<string, unknown>,
) {
  const parsed = safeParseSearchMessagesToBotParams(params);
  if (!parsed.botId) {
    throw new Error("botId is required for searchMentionToBot (e.g. from auth.test)");
  }
  const query = `mentions:${parsed.botId} ${parsed.query ?? ""}`.trim();
  const ret = await searchMessages(baseUrl, token, { ...parsed, query });

  const matches = ret.messages.matches;
  if (!matches.length) return ret;

  const p = `<@${parsed.botId}>`;
  const mat = matches.filter((m) => (m.text ?? "").includes(p));
  return { ...ret, messages: { ...ret.messages, matches: mat } };
}

/** @see https://api.slack.com/methods/conversations.history */
async function conversationsHistory(
  baseUrl: string,
  token: string,
  params: Record<string, unknown>,
) {
  const parsed = safeParseConversationsHistoryParams(params);
  const raw = await slackFetch("/conversations.history", {
    query: parsed,
    method: "GET" as const,
    opt: { baseUrl, token },
  });
  return conversationsHistoryResponseSchema.parse(raw);
}

/** @see https://api.slack.com/methods/conversations.list */
async function conversationsList(
  baseUrl: string,
  token: string,
  params: Record<string, unknown> = {},
) {
  const parsed = safeParseConversationsListParams({ limit: 10, ...params });
  const raw = await slackFetch("/conversations.list", {
    query: parsed,
    method: "GET" as const,
    opt: { baseUrl, token },
  });
  return conversationsListResponseSchema.parse(raw);
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
    authTest: () => authTest(baseUrl, token),
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
    /** Bot へのメンションを search.messages で検索。search:read が必要。botId は呼び出し元で auth.test から取得して渡す。 */
    searchMentionToBot: (opts: Record<string, unknown>) =>
      searchMessagesMentionToBot(baseUrl, token, opts),
  };
}

/** Bot Token 用クライアント。token には xoxb-... を渡す。
 * getMentionsToBot で Bot へのメンションを conversations.list + history から収集する。 */
export function slackBotClient(opt: SlackClientOpt) {
  const token = botTokenSchema.parse(opt.token);
  const { baseUrl } = opt;
  return createBaseClient(baseUrl, token);
}
