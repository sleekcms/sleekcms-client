import type { SleekSiteContent, SleekClient, SleekAsyncClient, ClientOptions, Page, List, Image, Entry } from "./types";
import { fetchSiteContent, fetchEnvTag, applyJmes, extractSlugs, filterPagesByPath } from "./lib";

export type { SleekSiteContent, ClientOptions, List, Image };

export async function createClient(options: ClientOptions): Promise<SleekClient> {
  const data = await fetchSiteContent(options) as SleekSiteContent;

  function getContent(query?: string): SleekSiteContent {
    return applyJmes(data, query);
  }

  function getPages(path: string): SleekSiteContent["pages"] {
    if (!path) {
      throw new Error("[SleekCMS] path is required for getPages");
    }

    return filterPagesByPath(data.pages, path);
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

  function getEntry(handle: string): Entry | Entry[] | null {
    if (!handle) {
      throw new Error("[SleekCMS] handle is required for getEntry");
    }

    const entries = data.entries ?? {};
    const entry = entries[handle] ?? null;
    return entry;
  }

  function getSlugs(path: string): string[] {
    if (!path) {
      throw new Error("[SleekCMS] path is required for getSlugs");
    }

    return extractSlugs(data.pages, path);
  }

  function getImage(name: string): Image | null {
    if (!name) return null;
    return data.images ? data.images[name] : null;
  }

  function getList(name: string): List | null {
    if (!name) return null;
    const lists = data.lists ?? {};
    const list = lists[name];
    return Array.isArray(list) ? list : null;
  }

  return {
    getContent,
    getPages,
    getPage,
    getEntry,
    getSlugs,
    getImage,
    getList
  };
}

export function createAsyncClient({ siteToken, env = 'latest', cdn, lang}: ClientOptions): SleekAsyncClient | any {

  let syncClient: SleekClient | null = null;
  let tag: string | null = null;
  let cache = {} as any;

  async function getContent(search?: string): Promise<SleekSiteContent | null> {
    if (cdn && !tag) tag = await fetchEnvTag({siteToken, env});
    if (!search && !syncClient) {
      syncClient = await createClient({ siteToken, env: tag ?? env, cdn, lang });
      cache = {}; // don't need cache now
    }
    if (syncClient) return syncClient.getContent(search);
    if (!search) return null; // unlikely
    
    if (!cache[search]) cache[search] = await fetchSiteContent({ siteToken, env: tag ?? env, search, lang }) as SleekSiteContent;
    return cache[search] ?? null;
  }

  async function getPages(path: string): Promise<SleekSiteContent["pages"]> {
    if (cdn && !tag) tag = await fetchEnvTag({siteToken, env});
    if (syncClient) return syncClient.getPages(path);

    if (!cache.pages) cache.pages = await fetchSiteContent({ siteToken, env: tag ?? env, search: 'pages', lang }) as SleekSiteContent["pages"];
    if (!path) return cache.pages;
    else return filterPagesByPath(cache.pages, path);
  }

  async function getPage(path: string): Promise<Page | null> {
    if (cdn && !tag) tag = await fetchEnvTag({siteToken, env});
    if (syncClient) return syncClient.getPage(path);

    if (!cache.pages) cache.pages = await fetchSiteContent({ siteToken, env: tag ?? env, search: 'pages', lang }) as SleekSiteContent["pages"];
    const page = cache.pages?.find((p: any) => {
      const pth = typeof p._path === "string" ? p._path : "";
      return pth === path;
    });

    return page ?? null;
  }

  async function getEntry(handle: string): Promise<Entry | Entry[] | null> {
    if (cdn && !tag) tag = await fetchEnvTag({siteToken, env});
    if (syncClient) return syncClient.getEntry(handle);

    let search = `entries.${handle}`;
    if (cache[search] === undefined) {
      cache[search] = await fetchSiteContent({ siteToken, env: tag ?? env, search, lang }) as Entry | Entry[] | null;
    }
    return cache[search];
  }

  async function getSlugs(path: string): Promise<string[]> {
    if (cdn && !tag) tag = await fetchEnvTag({siteToken, env});
    if (syncClient) return syncClient.getSlugs(path);

    if (!cache.pages) cache.pages = await fetchSiteContent({ siteToken, env: tag ?? env, search: 'pages', lang }) as SleekSiteContent["pages"];
    return extractSlugs(cache.pages, path);
  }

  async function getImage(name: string): Promise<Image | null> {
    if (cdn && !tag) tag = await fetchEnvTag({siteToken, env});
    if (syncClient) return syncClient.getImage(name);

    if (!cache.images) cache.images = await fetchSiteContent({ siteToken, env: tag ?? env, search: 'images', lang }) as Record<string, Image>;
    return cache.images ? cache.images[name] : null;
  }

  async function getList(name: string): Promise<List | null> {
    if (cdn && !tag) tag = await fetchEnvTag({siteToken, env});
    if (syncClient) return syncClient.getList(name);

    if (!cache.lists) cache.lists = await fetchSiteContent({ siteToken, env: tag ?? env, search: 'lists', lang }) as Record<string, List>;
    const list = cache.lists[name];
    return Array.isArray(list) ? list : null;
  }

  return {
    getContent,
    getPages,
    getPage,
    getEntry,
    getSlugs,
    getImage,
    getList
  }
}