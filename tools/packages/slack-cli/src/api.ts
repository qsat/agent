const DEFAULT_SLACK_API = "https://slack.com/api";

export type SlackClientOpt = {
  token: string;
  /** Slack API base URL (e.g. https://slack.com/api). Defaults to DEFAULT_SLACK_API. */
  baseUrl?: string;
};

async function slackFetch(
  baseUrl: string,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers as Record<string, string>),
    },
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

function channelsList(
  baseUrl: string,
  token: string,
): Promise<Record<string, unknown>> {
  return slackFetch(
    baseUrl,
    token,
    "/conversations.list?limit=200&types=public_channel,private_channel",
  );
}

function conversationsList(
  baseUrl: string,
  token: string,
): Promise<Record<string, unknown>> {
  return slackFetch(baseUrl, token, "/conversations.list?limit=200");
}

function chatPostMessage(
  baseUrl: string,
  token: string,
  channel: string,
  text: string,
): Promise<Record<string, unknown>> {
  return slackFetch(baseUrl, token, "/chat.postMessage", {
    method: "POST",
    body: JSON.stringify({ channel, text }),
  });
}

/** Slack API client. Pass token and optional baseUrl via opt; no process.env dependency. */
export function slackClient(opt: SlackClientOpt) {
  const baseUrl = opt.baseUrl ?? DEFAULT_SLACK_API;
  const { token } = opt;
  return {
    listChannels: () => channelsList(baseUrl, token),
    listConversations: () => conversationsList(baseUrl, token),
    postMessage: (channel: string, text: string) =>
      chatPostMessage(baseUrl, token, channel, text),
  };
}
