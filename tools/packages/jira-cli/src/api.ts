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
    throw new Error(`Jira API ${res.status}: ${await res.text()}`);
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

export async function issueCreate(
  baseUrl: string,
  auth: string,
  projectKey: string,
  summary: string
): Promise<unknown> {
  return jiraFetch(baseUrl, auth, "/issue", {
    method: "POST",
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary,
        issuetype: { name: "Task" },
      },
    }),
  });
}
