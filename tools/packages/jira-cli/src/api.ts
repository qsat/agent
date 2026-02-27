import { issueGetParamsSchema, searchParamsSchema } from "./schemas.js";

export type JiraAuth = { user: string; token: string };

export type JiraClientOpt = JiraAuth & { baseUrl: string };

function authHeader(auth: JiraAuth): string {
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
  const filtered = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== "",
    ) as [string, string | number | boolean][],
  );
  const q = new URLSearchParams(
    Object.entries(filtered).map(([k, v]) => [k, String(v)]),
  ).toString();
  return q ? `?${q}` : "";
}

async function jiraFetch(
  path: string,
  o: JiraClientOpt,
  query?: QueryParams,
): Promise<unknown> {
  const url = `${o.baseUrl}/rest/api/3${path}${toQueryString(query ?? {})}`;
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader(o),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(buildErrorMessage(res.status, text, "Jira API"));
  }
  return res.json();
}

export async function projectsList(o: JiraClientOpt): Promise<unknown> {
  return jiraFetch("/project", o, {});
}

export async function issueGet(
  o: JiraClientOpt,
  query: { key: string },
): Promise<unknown> {
  const parsed = issueGetParamsSchema.parse(query);
  return jiraFetch(`/issue/${encodeURIComponent(parsed.key)}`, o);
}

export async function searchJql(
  o: JiraClientOpt,
  query: { jql: string; maxResults?: number },
): Promise<unknown> {
  const parsed = searchParamsSchema.parse(query);
  return jiraFetch("/search", o, {
    jql: parsed.jql,
    maxResults: parsed.maxResults ?? 50,
  });
}
