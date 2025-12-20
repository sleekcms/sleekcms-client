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

function getUrl({siteToken, env, search, lang, devEnv = "production"}: {siteToken: string; env?: string; search?: string; devEnv?: string, lang?: string}): string {
  const baseUrl = getBaseUrl(siteToken, devEnv).replace(/\/$/, "");
  const url = new URL(`${baseUrl}/${env}`);
  if (search) url.searchParams.append("search", search);
  if (lang) url.searchParams.append("lang", lang);

  return url.toString();
}

export async function fetchEnvTag({siteToken, env}: {siteToken: string; env: string}) : Promise<string> {
  const url = getUrl({siteToken, env});
  try {
    let res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: siteToken
      }
    });
    if (res.ok) {
      let data = await res.json() as { tag?: string };
      if (data.tag) {
        return data.tag;
      }
    }
  } catch (e) {
    console.error("[SleekCMS] Unable to resolve env tag.");
  }
  return env;
}

export async function fetchSiteContent(options: ClientOptions & { search?: string }): Promise<any> {
  const { siteToken, env = 'latest', cdn = false, search, lang } = options;
  
  let url = getUrl({siteToken, env, search, lang});
  if (cdn && !search) {
    let tag = await fetchEnvTag({siteToken, env});
    url = getUrl({siteToken, env: tag, search, lang});
  }

  const res = await fetch(url, {
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

  return await res.json() as any;
}

export function isDevToken_export(token: string): boolean {
  return isDevToken(token);
}

export function extractSlugs(pages: SleekSiteContent["pages"], path: string): string[] {
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

export function filterPagesByPath(pages: SleekSiteContent["pages"], path: string): SleekSiteContent["pages"] {
  const pagesList = pages ?? [];
  return pagesList.filter((p) => {
    const pth = typeof p._path === "string" ? p._path : "";
    return pth.startsWith(path);
  });
}