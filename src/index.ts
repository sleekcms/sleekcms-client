import type { SleekSiteContent, ClientOptions, Page } from "./types";
import { createFetchSiteContent, applyJmes } from "./lib";

export type { SleekSiteContent, ClientOptions };

/**
 * Helper function to extract slugs from pages matching a path prefix
 */
function extractSlugs(pages: SleekSiteContent["pages"], path: string): string[] {
  const slugs: string[] = [];
  const pagesList = pages ?? [];

  for (const page of pagesList) {
    const pth = typeof page._path === "string" ? page._path : "";
    if (pth.startsWith(path) && "_slug" in page && typeof page._slug === "string") {
      slugs.push(page._slug);
    }
  }

  return slugs;
}

/**
 * Helper function to filter pages by path prefix
 */
function filterPagesByPath(pages: SleekSiteContent["pages"], path: string): SleekSiteContent["pages"] {
  const pagesList = pages ?? [];
  return pagesList.filter((p) => {
    const pth = typeof p._path === "string" ? p._path : "";
    return pth.startsWith(path);
  });
}

/**
 * Async SleekCMS client: methods return Promises.
 */
export interface SleekClient {
  getContent(query?: string): Promise<SleekSiteContent>;
  getPages(path: string, query?: string): Promise<SleekSiteContent["pages"]>;
  getPage(path: string): Promise<Page>;
  getSlugs(path: string): Promise<string[]>;
  getImages(): Promise<SleekSiteContent["images"]>;
  getImage(name: string): Promise<unknown | undefined>;
  getList<T = unknown>(name: string): Promise<T[] | undefined>;
}

/**
 * Sync client: prefetches full content once; subsequent calls are in-memory only.
 */
export interface SleekSyncClient {
  getContent(query?: string): SleekSiteContent;
  getPages(path: string, query?: string): SleekSiteContent["pages"];
  getPage(path: string): Page | null;
  getSlugs(path: string): string[];
  getImages(): SleekSiteContent["images"];
  getImage(name: string): unknown | undefined;
  getList<T = unknown>(name: string): T[] | undefined;
}

export function createClient(options: ClientOptions): SleekClient {
  const fetchSiteContent = createFetchSiteContent(options);

  async function getContent(query?: string): Promise<SleekSiteContent> {
    return (await fetchSiteContent(query)) as SleekSiteContent;
  }

  async function getPages(path: string, query?: string): Promise<SleekSiteContent["pages"]> {
    if (!path) {
      throw new Error("[SleekCMS] path is required for getPages");
    }

    const data = (await fetchSiteContent()) as SleekSiteContent;
    const filtered = filterPagesByPath(data.pages, path);
    return applyJmes(filtered, query);
  }

  async function getPage(path: string): Promise<Page> {
    if (!path) {
      throw new Error("[SleekCMS] path is required for getPage");
    }

    const data = (await fetchSiteContent()) as SleekSiteContent;
    const pages = data.pages ?? [];
    const page = pages.find((p) => {
      const pth = typeof p._path === "string" ? p._path : "";
      return pth === path;
    });

    if (!page) {
      throw new Error(`[SleekCMS] Page not found: ${path}`);
    }

    return page;
  }

  async function getSlugs(path: string): Promise<string[]> {
    if (!path) {
      throw new Error("[SleekCMS] path is required for getSlugs");
    }

    const data = (await fetchSiteContent()) as SleekSiteContent;
    return extractSlugs(data.pages, path);
  }

  async function getImages(): Promise<SleekSiteContent["images"]> {
    const data = (await fetchSiteContent()) as SleekSiteContent;
    return data.images ?? {};
  }

  async function getImage(name: string): Promise<unknown | undefined> {
    if (!name) return undefined;
    const data = (await fetchSiteContent()) as SleekSiteContent;
    return data.images ? data.images[name] : undefined;
  }

  async function getList<T = unknown>(
    name: string
  ): Promise<T[] | undefined> {
    if (!name) return undefined;
    const data = (await fetchSiteContent()) as SleekSiteContent;
    const lists = data.lists ?? {};
    const list = lists[name];
    return Array.isArray(list) ? (list as T[]) : undefined;
  }

  return {
    getContent,
    getPages,
    getPage,
    getSlugs,
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
export async function createSyncClient(options: ClientOptions): Promise<SleekSyncClient> {
  const fetchSiteContent = createFetchSiteContent(options);
  const data = (await fetchSiteContent()) as SleekSiteContent;

  function getContent(query?: string): SleekSiteContent {
    return applyJmes(data, query);
  }

  function getPages(path: string, query?: string): SleekSiteContent["pages"] {
    if (!path) {
      throw new Error("[SleekCMS] path is required for getPages");
    }

    const filtered = filterPagesByPath(data.pages, path);
    return applyJmes(filtered, query);
  }

  function getPage(path: string): Page | null {
    if (!path) {
      throw new Error("[SleekCMS] path is required for getPage");
    }

    const pages = data.pages ?? [];
    const page = pages.find((p) => {
      const pth = typeof p._path === "string" ? p._path : "";
      return pth === path;
    });

    return page ?? null;
  }

  function getSlugs(path: string): string[] {
    if (!path) {
      throw new Error("[SleekCMS] path is required for getSlugs");
    }

    return extractSlugs(data.pages, path);
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
    getPages,
    getPage,
    getSlugs,
    getImages,
    getImage,
    getList
  };
}
