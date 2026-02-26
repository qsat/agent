export type SlackClientOpt = {
  token: string;
  /** Slack API base URL (e.g. https://slack.com/api). */
  baseUrl: string;
};

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
  | SlackApiArgsGetBase<
      "/search.messages",
      { query: string; count?: number; sort?: string }
    >
  | SlackApiArgsGetBase<
      "/conversations.history",
      {
        channel: string;
        limit?: number;
        cursor?: string;
        /** この Unix ts より後のメッセージのみ（特定メッセージより後を取得するときに指定） */
        oldest?: string;
        /** この Unix ts より前のメッセージのみ */
        latest?: string;
      }
    >
  | SlackApiArgsGetBase<
      "/conversations.list",
      { limit?: number; types?: string }
    >;

export type SlackApiPostArgs =
  | SlackApiArgsPostBase<"/auth.test">
  | SlackApiArgsPostBase<
      "/chat.postMessage",
      {
        body: { channel: string; text: string };
      }
    >;

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
  const path = args[0];
  const payload = args[1];
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

function authTest(
  baseUrl: string,
  token: string,
): Promise<Record<string, unknown>> {
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
  limit?: number;
  cursor?: string;
  /** この Unix ts より後のメッセージのみ（例: 特定メッセージの ts を指定するとそのメッセージより後を取得） */
  oldest?: string;
  /** この Unix ts より前のメッセージのみ */
  latest?: string;
};

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

/** Slack API client. Pass token and baseUrl via opt; no process.env dependency. */
export function slackClient(opt: SlackClientOpt) {
  const { token, baseUrl } = opt;
  return {
    listChannels: () => channelsList(baseUrl, token),
    listConversations: () => conversationsList(baseUrl, token),
    postMessage: (channel: string, text: string) =>
      chatPostMessage(baseUrl, token, { channel, text }),
    /** チャンネルの履歴を取得。oldest にメッセージの ts を指定すると、そのメッセージより後のメッセージのみ取得できる。 */
    getChannelHistory: (params: ConversationsHistoryParams) =>
      conversationsHistory(baseUrl, token, params),
    /** 自分へのメンションを含むメッセージを検索（search.messages）。user token の search:read が必要。 */
    getMentionsToMe: async (opts?: { count?: number }) => {
      const auth = (await authTest(baseUrl, token)) as { user_id?: string };
      const userId = auth.user_id;
      if (!userId) throw new Error("auth.test did not return user_id");
      const res = await searchMessages(baseUrl, token, {
        query: `mentions:<@${userId}>`,
        count: opts?.count ?? 20,
        sort: "timestamp",
      });
      const messages = res.messages as Record<string, unknown> | undefined;
      const matches = messages?.matches as
        | Record<string, unknown>[]
        | undefined;
      const query = (res.query as string) ?? `mentions:<@${userId}>`;
      return { matches: matches ?? [], query };
    },
    /** 自分のメッセージのうち、リアクションが付いているものを収集。conversations.list + history を使用。 */
    getReactionsToMyMessages: async (opts?: {
      channelLimit?: number;
      historyLimit?: number;
    }) => {
      const auth = (await authTest(baseUrl, token)) as { user_id?: string };
      const userId = auth.user_id;
      if (!userId) throw new Error("auth.test did not return user_id");
      const listRes = await conversationsList(baseUrl, token);
      const chs = (listRes.channels ?? []) as Array<{ id: string }>;
      const channelLimit = opts?.channelLimit ?? 15;
      const historyLimit = opts?.historyLimit ?? 30;
      const results: Array<{
        channel: string;
        message: Record<string, unknown>;
        reactions: unknown[];
      }> = [];
      for (const c of chs.slice(0, channelLimit)) {
        if (!c?.id) continue;
        try {
          const hist = (await conversationsHistory(baseUrl, token, {
            channel: c.id,
            limit: historyLimit,
          })) as { messages?: Array<Record<string, unknown>> };
          const messages = hist.messages ?? [];
          for (const msg of messages) {
            if (msg.user !== userId) continue;
            const reactions = msg.reactions as unknown[] | undefined;
            if (reactions && reactions.length > 0) {
              results.push({ channel: c.id, message: msg, reactions });
            }
          }
        } catch {
          // not_in_channel などはスキップ
        }
      }
      return { userId, items: results };
    },
  };
}
