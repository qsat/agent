const SLACK_API = "https://slack.com/api";

export type SlackClientOpt = { token: string };

async function slackFetch(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  const res = await fetch(`${SLACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers as Record<string, string>),
    },
  });
  return (await res.json()) as Record<string, unknown>;
}

function channelsList(token: string): Promise<Record<string, unknown>> {
  return slackFetch(
    token,
    "/conversations.list?limit=200&types=public_channel,private_channel",
  );
}

function conversationsList(token: string): Promise<Record<string, unknown>> {
  return slackFetch(token, "/conversations.list?limit=200");
}

function chatPostMessage(
  token: string,
  channel: string,
  text: string,
): Promise<Record<string, unknown>> {
  return slackFetch(token, "/chat.postMessage", {
    method: "POST",
    body: JSON.stringify({ channel, text }),
  });
}

/** Slack API client. Pass token via opt; no process.env dependency. */
export function slackClient(opt: SlackClientOpt) {
  const { token } = opt;
  return {
    listChannels: () => channelsList(token),
    listConversations: () => conversationsList(token),
    postMessage: (channel: string, text: string) =>
      chatPostMessage(token, channel, text),
  };
}
