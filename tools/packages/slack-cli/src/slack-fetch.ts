/**
 * Slack API への HTTP リクエストを行う fetch ラッパー。
 */

export type SlackClientOpt = {
  token: string;
  /** Slack API base URL (e.g. https://slack.com/api). */
  baseUrl: string;
};

type SlackApiParams = Record<string, string | number | boolean | undefined>;

type SlackApiArgs =
  | [
      path: string,
      payload: {
        method: "GET";
        query: SlackApiParams;
        opt: SlackClientOpt;
      },
    ]
  | [
      path: string,
      payload: {
        method: "POST";
        body?: Record<string, unknown>;
        opt: SlackClientOpt;
      },
    ];

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
  params: SlackApiParams | Record<string, unknown>;
} {
  const [path, payload] = args;
  if (payload.method === "GET") {
    return { path, params: payload.query };
  }
  const params = "body" in payload && payload.body ? payload.body : {};
  return { path, params };
}

export async function slackFetch(
  ...args: SlackApiArgs
): Promise<Record<string, unknown>> {
  const { opt, method } = args[1];
  const { baseUrl, token } = opt;
  const { path, params } = getPathAndParams(args);

  const url =
    method === "GET"
      ? `${baseUrl}${path}${toQuery(params as SlackApiParams)}`
      : `${baseUrl}${path}`;
  const bodyParams = filterObject(params as Record<string, unknown>);
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
