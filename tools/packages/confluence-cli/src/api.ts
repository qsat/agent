export function getBaseUrl(): string | undefined {
  const base = process.env.CONFLUENCE_BASE_URL;
  if (!base) return undefined;
  return base.replace(/\/$/, "");
}

export function getAuthHeader(): string | undefined {
  const user = process.env.CONFLUENCE_USER;
  const token = process.env.CONFLUENCE_TOKEN;
  if (!user || !token) return undefined;
  const encoded = Buffer.from(`${user}:${token}`).toString("base64");
  return `Basic ${encoded}`;
}

async function confluenceFetch(
  baseUrl: string,
  auth: string,
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  const url = `${baseUrl}/rest/api/content${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    throw new Error(`Confluence API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function spacesList(baseUrl: string, auth: string): Promise<unknown> {
  const res = await fetch(`${baseUrl}/rest/api/space`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Spaces API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function pageGet(
  baseUrl: string,
  auth: string,
  pageId: string
): Promise<unknown> {
  return confluenceFetch(baseUrl, auth, `/${pageId}?expand=body.storage,version`);
}

export async function searchCql(
  baseUrl: string,
  auth: string,
  cql: string
): Promise<unknown> {
  const path = `/search?cql=${encodeURIComponent(cql)}&limit=20`;
  const res = await fetch(`${baseUrl}/rest/api/content${path}`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Search API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function pageCreate(
  baseUrl: string,
  auth: string,
  spaceKey: string,
  title: string,
  bodyHtml: string
): Promise<unknown> {
  const res = await fetch(`${baseUrl}/rest/api/content`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      type: "page",
      title,
      space: { key: spaceKey },
      body: { storage: { value: bodyHtml, representation: "storage" } },
    }),
  });
  if (!res.ok) throw new Error(`Page create ${res.status}: ${await res.text()}`);
  return res.json();
}
