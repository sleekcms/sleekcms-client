
export type Entry = Record<string, unknown>;
export type Page = { _path: string; [key: string]: unknown };
export type Image = { url: string; [key: string]: unknown };
export type List = Array<{ label: string; value: string }>;

export interface SleekSiteContent {
  entries?: {
    [handle: string]: Entry | Entry[];
  };
  pages?: Array<Page>;
  images?: Record<string, Image>;
  lists?: Record<string, List>;
  config?: { title?: string; };
}

export interface SyncCacheAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AsyncCacheAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface ClientOptions {
  siteToken: string;
  env?: string; // site env / alias
  cdn?: boolean;
  lang?: string;
  cache?: SyncCacheAdapter | AsyncCacheAdapter;
  cacheExpiry?: number; // cache expiration in minutes
}

export interface SleekClient {
  getContent(query?: string): SleekSiteContent;
  getPages(path: string): SleekSiteContent["pages"];
  getPage(path: string): Page | null;
  getEntry(handle: string): Entry | Entry[] | null;
  getSlugs(path: string): string[];
  getImage(name: string): Image | null;
  getList(name: string): List | null;
}

export interface SleekAsyncClient {
  getContent(query?: string): Promise<SleekSiteContent>;
  getPages(path: string): Promise<SleekSiteContent["pages"]>;
  getPage(path: string): Promise<Page | null>;
  getEntry(handle: string): Promise<Entry | Entry[] | null>;
  getSlugs(path: string): Promise<string[]>;
  getImage(name: string): Promise<Image | null>;
  getList(name: string): Promise<List | null>;
}