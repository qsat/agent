export type ConfluenceAuth = { user: string; token: string };

export type ConfluenceClientOpt = { baseUrl: string } & ConfluenceAuth;

function authHeader(auth: ConfluenceAuth): string {
  const encoded = Buffer.from(`${auth.user}:${auth.token}`).toString("base64");
  return `Basic ${encoded}`;
}

function buildErrorMessage(
  status: number,
  text: string,
  prefix: string,
): string {
  let msg = text;
  try {
    const body = JSON.parse(text) as {
      errorMessages?: string[];
      errors?: Record<string, string>;
    };
    const parts: string[] = [];
    if (body.errorMessages?.length) parts.push(...body.errorMessages);
    if (body.errors && typeof body.errors === "object")
      parts.push(...Object.entries(body.errors).map(([k, v]) => `${k}: ${v}`));
    if (parts.length) msg = parts.join("; ");
  } catch {
    /* use text as is */
  }
  return `${prefix} ${status}: ${msg}`;
}

type QueryParams = Record<string, string | number | boolean | undefined>;

function toQueryString(params: QueryParams): string {
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => [k, String(v)]);
  const q = new URLSearchParams(filtered).toString();
  return q ? `?${q}` : "";
}

async function confluenceFetch(
  path: string,
  o: ConfluenceClientOpt,
  query?: QueryParams,
): Promise<unknown> {
  const url = `${o.baseUrl}/rest/api${path}${toQueryString(query ?? {})}`;
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader(o),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(buildErrorMessage(res.status, text, path));
  }
  return res.json();
}

export async function spacesList(o: ConfluenceClientOpt): Promise<unknown> {
  return confluenceFetch("/content/space", o, { limit: 1000 });
}

export async function pageGet(
  pageId: string,
  o: ConfluenceClientOpt,
): Promise<unknown> {
  return confluenceFetch(`/content/${pageId}`, o, {
    expand: "body.storage,version",
  });
}

export async function searchCql(
  cql: string,
  o: ConfluenceClientOpt,
): Promise<unknown> {
  return confluenceFetch("/content/search", o, { cql, limit: 20 });
}

/** 認証中のユーザー情報を取得（accountId 含む）。 */
export async function userCurrent(o: ConfluenceClientOpt): Promise<unknown> {
  return confluenceFetch("/user/current", o);
}
