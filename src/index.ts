import jmespath from "jmespath";
import type { SleekSiteContent, ClientOptions } from "./types";

function isDevToken(token: string): boolean {
  return token.startsWith("dev-");
}

function getBaseUrl(token: string): string {
  let [env, siteId, ...rest] = token.split("-");
  return `https://${env}.sleekcms.com/${siteId}`;
}

/**
 * Low-level fetch helper.
 * - If `searchQuery` is provided, it's sent as `?search=<JMESPath>`.
 * - If options.mock === true and token is dev-..., `mock=true` is added.
 */
async function fetchSiteContent(
  options: ClientOptions,
  searchQuery?: string
): Promise<any> {
  const { siteToken, env = "latest", mock } = options;

  if (!siteToken) {
    throw new Error("[SleekCMS] siteToken is required");
  }

  const baseUrl = getBaseUrl(siteToken).replace(/\/$/, "");
  const url = new URL(`${baseUrl}/${env}`);

  if (searchQuery) {
    url.searchParams.set("search", searchQuery);
  }

  if (mock && isDevToken(siteToken)) {
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

  return res.json();
}

function applyJmes<T = unknown>(data: unknown, query?: string): T {
  if (!query) return data as T;
  return jmespath.search(data, query) as T;
}

export type { SleekSiteContent, ClientOptions };

/**
 * Async SleekCMS client: methods return Promises.
 */
export interface SleekClient {
  getContent<T = SleekSiteContent>(query?: string): Promise<T>;
  findPages<T = unknown>(path: string, query?: string): Promise<T>;
  getImages(): Promise<SleekSiteContent["images"]>;
  getImage(name: string): Promise<unknown | undefined>;
  getList<T = unknown>(name: string): Promise<T[] | undefined>;
}

/**
 * Sync client: prefetches full content once; subsequent calls are in-memory only.
 */
export interface SleekSyncClient {
  getContent<T = SleekSiteContent>(query?: string): T;
  findPages<T = unknown>(path: string, query?: string): T;
  getImages(): SleekSiteContent["images"];
  getImage(name: string): unknown | undefined;
  getList<T = unknown>(name: string): T[] | undefined;
}

export function createClient(options: ClientOptions): SleekClient {
  const dev = isDevToken(options.siteToken);

  let cacheMode = !!options.cache || (!!options.mock && dev);
  let cachedContent: SleekSiteContent | null = null;

  async function ensureCacheLoaded(): Promise<SleekSiteContent> {
    if (cachedContent) return cachedContent;
    const data = (await fetchSiteContent(options)) as SleekSiteContent;
    cachedContent = data;
    return data;
  }

  async function getContent<T = SleekSiteContent>(query?: string): Promise<T> {
    if (cacheMode) {
      const data = await ensureCacheLoaded();
      return applyJmes<T>(data, query);
    }

    if (!query) {
      const data = (await fetchSiteContent(options)) as SleekSiteContent;
      cachedContent = data;
      cacheMode = true;
      return data as T;
    }

    const data = await fetchSiteContent(options, query);
    return data as T;
  }

  async function findPages<T = unknown>(
    path: string,
    query?: string
  ): Promise<T> {
    if (!path) {
      throw new Error("[SleekCMS] path is required for findPages");
    }

    if (cacheMode) {
      const data = await ensureCacheLoaded();
      const pages = data.pages ?? [];
      const filtered = pages.filter((p) => {
        const pth = typeof p._path === "string" ? p._path : "";
        return pth.startsWith(path);
      });
      return applyJmes<T>(filtered, query);
    }

    const pages = (await fetchSiteContent(
      options,
      "pages"
    )) as SleekSiteContent["pages"];

    const filtered = (pages ?? []).filter((p) => {
      const pth = typeof p._path === "string" ? p._path : "";
      return pth.startsWith(path);
    });

    return applyJmes<T>(filtered, query);
  }

  async function getImages(): Promise<SleekSiteContent["images"]> {
    if (cacheMode) {
      const data = await ensureCacheLoaded();
      return data.images ?? {};
    }

    const images = (await fetchSiteContent(
      options,
      "images"
    )) as SleekSiteContent["images"];
    return images ?? {};
  }

  async function getImage(name: string): Promise<unknown | undefined> {
    if (!name) return undefined;

    if (cacheMode) {
      const data = await ensureCacheLoaded();
      return data.images ? data.images[name] : undefined;
    }

    const images = (await fetchSiteContent(
      options,
      "images"
    )) as SleekSiteContent["images"];
    return images ? images[name] : undefined;
  }

  async function getList<T = unknown>(
    name: string
  ): Promise<T[] | undefined> {
    if (!name) return undefined;

    if (cacheMode) {
      const data = await ensureCacheLoaded();
      const lists = data.lists ?? {};
      const list = lists[name];
      return Array.isArray(list) ? (list as T[]) : undefined;
    }

    const lists = (await fetchSiteContent(
      options,
      "lists"
    )) as SleekSiteContent["lists"];
    const list = lists ? lists[name] : undefined;
    return Array.isArray(list) ? (list as T[]) : undefined;
  }

  return {
    getContent,
    findPages,
    getImages,
    getImage,
    getList
  };
}

/**
 * Create a sync SleekCMS client.
 *
 * - Prefetches full content once (no search=).
 * - All operations (including JMESPath) are local and synchronous.
 */
export async function createSyncClient(
  options: ClientOptions
): Promise<SleekSyncClient> {
  const data = (await fetchSiteContent(options)) as SleekSiteContent;

  function getContent<T = SleekSiteContent>(query?: string): T {
    return applyJmes<T>(data, query);
  }

  function findPages<T = unknown>(path: string, query?: string): T {
    if (!path) {
      throw new Error("[SleekCMS] path is required for findPages");
    }

    const pages = data.pages ?? [];
    const filtered = pages.filter((p) => {
      const pth = typeof p._path === "string" ? p._path : "";
      return pth.startsWith(path);
    });

    return applyJmes<T>(filtered, query);
  }

  function getImages(): SleekSiteContent["images"] {
    return data.images ?? {};
  }

  function getImage(name: string): unknown | undefined {
    if (!name) return undefined;
    return data.images ? data.images[name] : undefined;
  }

  function getList<T = unknown>(name: string): T[] | undefined {
    if (!name) return undefined;
    const lists = data.lists ?? {};
    const list = lists[name];
    return Array.isArray(list) ? (list as T[]) : undefined;
  }

  return {
    getContent,
    findPages,
    getImages,
    getImage,
    getList
  };
}
