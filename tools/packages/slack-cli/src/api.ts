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
): Promise<{ user_id?: string }> {
  return slackFetch("/auth.test", {
    method: "POST" as const,
    opt: { baseUrl, token },
  });
}

export type SearchMessagesParams = {
  query: string;
  count?: number;
  sort?: string;
};

/** @see https://api.slack.com/methods/search.messages */
function searchMessages(
  baseUrl: string,
  token: string,
  params: SearchMessagesParams,
): Promise<Record<string, unknown>> {
  return slackFetch("/search.messages", {
    query: {
      query: params.query.trim(),
      count: params.count,
      sort: params.sort,
    },
    method: "GET" as const,
    opt: { baseUrl, token },
  });
}

export type ConversationsHistoryParams = {
  channel: string;
  /** この Unix ts より後のメッセージのみ（必須） */
  oldest: string;
  /** この Unix ts より前のメッセージのみ（必須） */
  latest: string;
  limit?: number;
  cursor?: string;
};

/** @see https://api.slack.com/methods/conversations.history */
function conversationsHistory(
  baseUrl: string,
  token: string,
  params: ConversationsHistoryParams,
): Promise<Record<string, unknown>> {
  return slackFetch("/conversations.history", {
    query: {
      channel: params.channel,
      limit: params.limit,
      cursor: params.cursor,
      oldest: params.oldest,
      latest: params.latest,
    },
    method: "GET" as const,
    opt: { baseUrl, token },
  });
}

export type ConversationsListParams = {
  limit?: number;
  types?: string;
};

/** @see https://api.slack.com/methods/conversations.list */
function channelsList(
  baseUrl: string,
  token: string,
  params: ConversationsListParams = {},
): Promise<Record<string, unknown>> {
  return slackFetch("/conversations.list", {
    query: {
      limit: params.limit ?? 10,
      types: params.types ?? "public_channel,private_channel",
    },
    method: "GET" as const,
    opt: { baseUrl, token },
  });
}

/** @see https://api.slack.com/methods/conversations.list */
function conversationsList(
  baseUrl: string,
  token: string,
  params: ConversationsListParams = {},
): Promise<Record<string, unknown>> {
  return slackFetch("/conversations.list", {
    query: { limit: params.limit ?? 10 },
    method: "GET" as const,
    opt: { baseUrl, token },
  });
}

export type ChatPostMessageParams = {
  channel: string;
  text: string;
};

/** @see https://api.slack.com/methods/chat.postMessage */
function chatPostMessage(
  baseUrl: string,
  token: string,
  params: ChatPostMessageParams,
): Promise<Record<string, unknown>> {
  return slackFetch("/chat.postMessage", {
    body: { channel: params.channel, text: params.text },
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

/** User Token 用クライアント。getMentionsToMe（search:read）を含む。token には xoxp-... を渡す。 */
export function slackUserClient(opt: SlackClientOpt) {
  assertToken(SLACK_USER_TOKEN_PREFIX, opt.token);
  const { token, baseUrl } = opt;
  const base = createBaseClient(baseUrl, token);
  return {
    ...base,
    /** 自分へのメンションを含むメッセージを検索。User token の search:read が必要。
     * oldest/latest の範囲外は結果から除外する（search.messages は範囲指定非対応のためクライアント側でフィルタ）。
     * @see https://api.slack.com/methods/auth.test
     * @see https://api.slack.com/methods/search.messages */
    getMentionsToMe: async (opts: {
      oldest: string;
      latest: string;
      count?: number;
    }) => {
      const auth = await authTest(baseUrl, token);
      const userId = auth.user_id;
      if (!userId) throw new Error("auth.test did not return user_id");
      const res = await searchMessages(baseUrl, token, {
        query: `mentions:<@${userId}>`,
        count: opts.count ?? 20,
        sort: "timestamp",
      });
      const messages = res.messages as Record<string, unknown> | undefined;
      const rawMatches = (messages?.matches as
        | Record<string, unknown>[]
        | undefined) ?? [];
      const query = (res.query as string) ?? `mentions:<@${userId}>`;
      const oldestNum = Number(opts.oldest);
      const latestNum = Number(opts.latest);
      const matches = rawMatches.filter((m) => {
        const ts = m.ts as string | undefined;
        if (!ts) return false;
        const t = Number(ts);
        return !Number.isNaN(t) && t >= oldestNum && t <= latestNum;
      });
      return { matches, query };
    },
  };
}

/** Bot Token 用クライアント。token には xoxb-... を渡す。
 * getMentionsToBot で Bot へのメンションを conversations.list + history から収集する。 */
export function slackBotClient(opt: SlackClientOpt) {
  assertToken(SLACK_BOT_TOKEN_PREFIX, opt.token);
  const { token, baseUrl } = opt;
  const base = createBaseClient(baseUrl, token);
  return {
    ...base,
    /** Bot へのメンションを含むメッセージを収集。conversations.list + history でチャンネルを走査する。
     * @see https://api.slack.com/methods/auth.test
     * @see https://api.slack.com/methods/conversations.list
     * @see https://api.slack.com/methods/conversations.history */
    getMentionsToBot: async (opts: {
      /** Unix ts（必須） */
      oldest: string;
      /** Unix ts（必須） */
      latest: string;
      channelLimit?: number;
      historyLimit?: number;
    }) => {
      const auth = (await authTest(baseUrl, token)) as { user_id?: string };
      const botUserId = auth.user_id;
      if (!botUserId) throw new Error("auth.test did not return user_id");
      const listRes = await conversationsList(baseUrl, token, {
        limit: opts.channelLimit ?? 20,
      });
      const chs = (listRes.channels ?? []) as Array<{ id: string }>;
      const historyLimit = opts.historyLimit ?? 50;
      const mention = `<@${botUserId}>`;
      const items: Array<{
        channel: string;
        message: Record<string, unknown>;
      }> = [];
      const { oldest, latest } = opts;
      for (const c of chs) {
        if (!c?.id) continue;
        try {
          const hist = (await conversationsHistory(baseUrl, token, {
            channel: c.id,
            oldest,
            latest,
            limit: historyLimit,
          })) as { messages?: Array<Record<string, unknown>> };
          const messages = hist.messages ?? [];
          for (const msg of messages) {
            const text = (msg.text as string) ?? "";
            if (text.includes(mention)) {
              items.push({ channel: c.id, message: msg });
            }
          }
        } catch {
          // not_in_channel などはスキップ
        }
      }
      return { botUserId, items };
    },
  };
}
