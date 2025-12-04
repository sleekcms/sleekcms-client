
type Entry = Record<string, unknown>;
type Page = { _path: string; [key: string]: unknown };
type Image = { url: string; [key: string]: unknown };
type List = Array<{ label: string; value: string }>;

export interface SleekSiteContent {
  entries?: Record<string, Entry> | Record<string, Entry[]>;
  pages?: Array<Page>;
  images?: Record<string, Image>;
  lists?: Record<string, List>;
  config?: { title?: string; };
}

export interface ClientOptions {
  siteToken: string;
  env?: string;
  cache?: boolean;
  mock?: boolean;
}
