export function getBaseUrl(): string | undefined {
  const base = process.env.JIRA_BASE_URL;
  if (!base) return undefined;
  return base.replace(/\/$/, "");
}

export function getAuthHeader(): string | undefined {
  const user = process.env.JIRA_USER;
  const token = process.env.JIRA_TOKEN;
  if (!user || !token) return undefined;
  const encoded = Buffer.from(`${user}:${token}`).toString("base64");
  return `Basic ${encoded}`;
}

function buildErrorMessage(status: number, text: string, prefix: string): string {
  let msg = text;
  try {
    const body = JSON.parse(text) as {
      errorMessages?: string[];
      errors?: Record<string, string>;
    };
    const parts: string[] = [];
    if (body.errorMessages?.length) parts.push(...body.errorMessages);
    if (
      body.errors &&
      typeof body.errors === "object"
    )
      parts.push(
        ...Object.entries(body.errors).map(([k, v]) => `${k}: ${v}`)
      );
    if (parts.length) msg = parts.join("; ");
  } catch {
    /* use text as is */
  }
  return `${prefix} ${status}: ${msg}`;
}

async function jiraFetch(
  baseUrl: string,
  auth: string,
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  const url = `${baseUrl}/rest/api/3${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(buildErrorMessage(res.status, text, "Jira API"));
  }
  return res.json();
}

export async function projectsList(baseUrl: string, auth: string): Promise<unknown> {
  return jiraFetch(baseUrl, auth, "/project");
}

export async function issueGet(
  baseUrl: string,
  auth: string,
  issueKey: string
): Promise<unknown> {
  return jiraFetch(baseUrl, auth, `/issue/${encodeURIComponent(issueKey)}`);
}

export async function searchJql(
  baseUrl: string,
  auth: string,
  jql: string
): Promise<unknown> {
  return jiraFetch(
    baseUrl,
    auth,
    `/search?jql=${encodeURIComponent(jql)}&maxResults=50`
  );
}
