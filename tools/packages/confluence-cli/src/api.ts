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
    const text = await res.text();
    throw new Error(buildErrorMessage(res.status, text, "Confluence API"));
  }
  return res.json();
}

export async function spacesList(baseUrl: string, auth: string): Promise<unknown> {
  const res = await fetch(`${baseUrl}/rest/api/space`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(buildErrorMessage(res.status, text, "Spaces API"));
  }
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(buildErrorMessage(res.status, text, "Search API"));
  }
  return res.json();
}
