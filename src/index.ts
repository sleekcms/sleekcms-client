import type { SleekSiteContent, SleekClient, SleekAsyncClient, ClientOptions, Page, Options, Image, Entry, SyncCacheAdapter, AsyncCacheAdapter, GetPagesOptions } from "./types";
import { fetchSiteContent, fetchEnvTag, applyJmes, extractSlugs, filterPagesByPath, getUrl } from "./lib";

export type { SleekSiteContent, SleekClient, SleekAsyncClient, ClientOptions, Page, Options, Image, Entry, SyncCacheAdapter, AsyncCacheAdapter, GetPagesOptions };

// Default in-memory cache
class MemoryCache implements SyncCacheAdapter {
  private cache = new Map<string, string>();
  
  getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }
  
  setItem(key: string, value: string): void {
    this.cache.set(key, value);
  }
}

export async function createSyncClient(options: ClientOptions): Promise<SleekClient> {
  const cache = options.cache ?? new MemoryCache();
  let meta: string | undefined  = Array.isArray(options.meta) ? options.meta.join(',') : options.meta;
  if (meta) meta = meta.replace(/\s/g, ''); // remove whitespace
                  
  const data = await fetchSiteContent({ ...options, cache, meta }) as SleekSiteContent;

  function getContent(query?: string): SleekSiteContent {
    return applyJmes(data, query);
  }

  function getPages(path: string, options?: GetPagesOptions): SleekSiteContent["pages"] {
    if (!path) {
      throw new Error("[SleekCMS] path is required for getPages");
    }

    return filterPagesByPath(data.pages, path, options);
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

  function getOptions(name: string): Options | null {
    if (!name) return null;
    const options = data.options ?? {};
    const optionSet = options[name];
    return Array.isArray(optionSet) ? optionSet : null;
  }

  return {
    getContent,
    getPages,
    getPage,
    getEntry,
    getSlugs,
    getImage,
    getOptions
  };
}

export function createAsyncClient(options: ClientOptions): SleekAsyncClient | any {
  const { siteToken, env = "latest", lang, cacheMinutes, devEnv } = options;
  let meta: string | undefined = Array.isArray(options.meta) ? options.meta.join(",") : options.meta;
  if (meta) meta = meta.replace(/\s/g, ""); // remove whitespace

  const flush = options.flush ?? options.resolveEnv ?? false;
  const cache = options.cache ?? new MemoryCache();

  let syncClient: SleekClient | null = null;

  async function getContent(search?: string): Promise<SleekSiteContent | null> {
    if (!search && !syncClient) {
      syncClient = await createSyncClient({ siteToken, env, flush, lang, cache, devEnv, meta });
    }
    if (syncClient) return syncClient.getContent(search);
    if (!search) return null; // unlikely

    return (await fetchSiteContent({ siteToken, env, search, lang, cache, cacheMinutes, flush, devEnv, meta })) as SleekSiteContent;
  }

  async function getPages(path: string, options?: GetPagesOptions): Promise<SleekSiteContent["pages"]> {
    if (syncClient) return syncClient.getPages(path, options);

    const pages = (await fetchSiteContent({ siteToken, env, search: "pages", lang, cache, cacheMinutes, flush, devEnv, meta })) as SleekSiteContent["pages"];
    return filterPagesByPath(pages, path, options);
  }

  async function getPage(path: string): Promise<Page | null> {
    if (syncClient) return syncClient.getPage(path);

    const pages = (await fetchSiteContent({ siteToken, env, search: "pages", lang, cache, cacheMinutes, flush, devEnv, meta })) as SleekSiteContent["pages"];
    const page = pages?.find((p: any) => {
      const pth = typeof p._path === "string" ? p._path : "";
      return pth === path;
    });

    return page ?? null;
  }

  async function getEntry(handle: string): Promise<Entry | Entry[] | null> {
    if (syncClient) return syncClient.getEntry(handle);

    let search = `entries.${handle}`;
    return (await fetchSiteContent({ siteToken, env, search, lang, cache, cacheMinutes, flush, devEnv, meta })) as Entry | Entry[] | null;
  }

  async function getSlugs(path: string): Promise<string[]> {
    if (syncClient) return syncClient.getSlugs(path);

    const pages = (await fetchSiteContent({ siteToken, env, search: "pages", lang, cache, cacheMinutes, flush, devEnv, meta })) as SleekSiteContent["pages"];
    return extractSlugs(pages, path);
  }

  async function getImage(name: string): Promise<Image | null> {
    if (syncClient) return syncClient.getImage(name);

    const images = (await fetchSiteContent({ siteToken, env, search: "images", lang, cache, cacheMinutes, flush, devEnv, meta })) as Record<string, Image>;
    return images ? images[name] : null;
  }

  async function getOptions(name: string): Promise<Options | null> {
    if (syncClient) return syncClient.getOptions(name);

    const options = (await fetchSiteContent({ siteToken, env, search: "options", lang, cache, cacheMinutes, flush, devEnv, meta })) as Record<string, Options>;
    const optionSet = options[name];
    return Array.isArray(optionSet) ? optionSet : null;
  }

  async function _getEnvTag(): Promise<string> {
    let resp = await fetchEnvTag({ siteToken, env, devEnv });
    return resp;
  }

  function _getFetchUrl(): string {
    return getUrl({ ...options, meta });
  }

  return {
    getContent,
    getPages,
    getPage,
    getEntry,
    getSlugs,
    getImage,
    getOptions,
    _getFetchUrl,
    _getEnvTag,
  };
}