import * as jmespath from "jmespath";
import type { ClientOptions, SleekSiteContent } from "./types";

function isDevToken(token: string): boolean {
  return token.startsWith("dev-");
}

function getBaseUrl(token: string, devEnv: string): string {
  let [env, siteId, ...rest] = token.split("-");
  if (devEnv === "production") return `https://${env}.sleekcms.com/${siteId}`;
  else if (devEnv === "development") return `https://${env}.sleekcms.net/${siteId}`;
  else if (devEnv === "localhost") return `http://localhost:9001/${env}/${siteId}`;
  else throw new Error(`[SleekCMS] Unknown devEnv: ${devEnv}`);
}

export function applyJmes(data: unknown, query?: string): any {
  if (!query) return data;
  return jmespath.search(data, query);
}

/**
 * Creates a fetchSiteContent function with internal caching.
 * - When called without searchQuery, fetches and caches the full content.
 * - Once cached, subsequent calls use local JMESPath search.
 * - If not cached and searchQuery is provided, uses API search (unless cache mode is enabled).
 */
export function createFetchSiteContent(options: ClientOptions) {
  const { siteToken, env = "latest", mock, devEnv = "production" } = options;
  const dev = isDevToken(siteToken);
  let cacheMode = !!options.cache || (!!mock && dev);
  
  let cachedContent: SleekSiteContent | null = null;

  return async function fetchSiteContent(searchQuery?: string): Promise<any> {
    if (!siteToken) {
      throw new Error("[SleekCMS] siteToken is required");
    }

    // If we have cached content, use it (with optional local search)
    if (cachedContent) {
      return applyJmes(cachedContent, searchQuery);
    }

    // Build the API URL
    const baseUrl = getBaseUrl(siteToken, devEnv).replace(/\/$/, "");
    const url = new URL(`${baseUrl}/${env}`);

    // If no cache and we have a search query, use API search
    if (searchQuery && !cacheMode && !cachedContent) {
      url.searchParams.set("search", searchQuery);
    }

    if (mock && dev) {
      url.searchParams.set("mock", "true");
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: siteToken
      }
    });

    if (!res.ok) {
      let message = res.statusText;
      try {
        const data = (await res.json()) as { message?: string };
        if (data && data.message) message = data.message;
      } catch {
        // ignore
      }
      throw new Error(`[SleekCMS] Request failed (${res.status}): ${message}`);
    }

    const data = await res.json();

    // Cache the response if no search query was provided (full content fetch)
    if (!searchQuery) {
      cachedContent = data as SleekSiteContent;
      cacheMode = true; // Enable cache mode after first full fetch
    }

    return data;
  };
}

export function isDevToken_export(token: string): boolean {
  return isDevToken(token);
}
