import "server-only";

export class KommoError extends Error {
  constructor(
    public status: number,
    public path: string,
    detail?: string,
  ) {
    super(`Kommo ${path} → ${status}${detail ? `: ${detail}` : ""}`);
  }
}

/** Accept "acme", "acme.kommo.com" or "https://acme.kommo.com/". */
function kommoHost(subdomain: string) {
  return subdomain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.kommo\.com$/, "");
}

/**
 * Authenticated call to the Kommo v4 API. Returns the parsed JSON, or null for an empty body
 * (204, or the 202 that queued tasks like a Salesbot launch return). Throws KommoError otherwise.
 */
export async function kommoFetch<T>(
  subdomain: string,
  token: string,
  path: string,
  init?: { method?: "GET" | "POST" | "PATCH"; body?: unknown },
): Promise<T | null> {
  const res = await fetch(`https://${kommoHost(subdomain)}.kommo.com/api/v4${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body !== undefined && { "Content-Type": "application/json" }),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new KommoError(res.status, path, text.slice(0, 300));
  return text.trim() ? (JSON.parse(text) as T) : null;
}
