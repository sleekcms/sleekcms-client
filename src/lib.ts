import * as jmespath from "jmespath";
import type { ClientOptions, SleekSiteContent } from "./types";

// Cache for resolved env tags to avoid repeated fetchEnvTag calls
const envTagCache = new Map<string, string>();

// Export function to clear the cache (useful for testing)
export function clearEnvTagCache() {
  envTagCache.clear();
}

function isDevToken(token: string): boolean {
  return token.startsWith("dev-");
}

function getBaseUrl(token: string, devEnv: string): string {
  let [env, siteId, ...rest] = token.split("-");
  if (devEnv === "production") return `https://pub.sleekcms.com/${siteId}`;
  else if (devEnv === "development") return `https://pub.sleekcms.net/${siteId}`;
  else if (devEnv === "localhost") return `http://localhost:9001/localhost/${siteId}`;
  else throw new Error(`[SleekCMS] Unknown devEnv: ${devEnv}`);
}

export function applyJmes(data: unknown, query?: string): any {
  if (!query) return data;
  return jmespath.search(data, query);
}

export function getUrl({siteToken, env, search, lang, devEnv = "production"}: {siteToken: string; env?: string; search?: string; devEnv?: string, lang?: string}): string {
  const baseUrl = getBaseUrl(siteToken, devEnv).replace(/\/$/, "");
  const url = new URL(`${baseUrl}/${env ?? 'latest'}`);
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
  const { siteToken, env = 'latest', resolveEnv = false, search, lang, cache, cacheMinutes } = options;
  
  let url = getUrl({siteToken, env, search, lang});
  if (resolveEnv) {
    const cacheKey = `${siteToken}:${env}`;
    let tag = envTagCache.get(cacheKey);
    
    try {
      if (!tag) {
        tag = await fetchEnvTag({siteToken, env});
        envTagCache.set(cacheKey, tag);
      }
      
      url = getUrl({siteToken, env: tag, search, lang});      
    } catch (error) {
      console.warn("[SleekCMS] Failed to resolve env tag, using cached content instead.");
    }
  }
  
  // Build cache key using URL (without token for security)
  const cacheKey = url;
  
  // Function to fetch and cache data
  const fetchAndCache = async () => {
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

    const data = await res.json() as any;
    
    // Always save to cache with timestamp
    if (cache) {
      try {
        const cacheData = { data, _ts: Date.now() };
        await Promise.resolve(cache.setItem(cacheKey, JSON.stringify(cacheData)));
      } catch (e) {
        // Cache write failed, continue without caching
        console.warn('[SleekCMS] Cache write failed:', e);
      }
    }
    
    return data;
  };
  
  // Check cache first
  if (cache) {
    try {
      const cached = await Promise.resolve(cache.getItem(cacheKey));
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          
          // Check if cache has timestamp (new format)
          if (cachedData._ts !== undefined) {
            // If expiry is set, check if cache is expired
            if (cacheMinutes) {
              const now = Date.now();
              const expiryMs = cacheMinutes * 60 * 1000; // convert minutes to milliseconds
              const age = now - cachedData._ts;
              
              if (age >= expiryMs) {
                try {
                  // Cache expired, continue to fetch
                  return await fetchAndCache();                  
                } catch (error) {
                  console.warn('[SleekCMS] Fetch failed, using expired cache:', error);
                }
              }
            }
            // Cache is valid or no expiry set, return the data
            return cachedData.data;
          } else {
            // Old format without timestamp (backward compatible)
            return cachedData;
          }
        } catch (e) {
          // Invalid cache data, continue to fetch
        }
      }
    } catch (e) {
      // Cache read failed, continue without using cache
      console.warn('[SleekCMS] Cache read failed:', e);
    }
  }

  return await fetchAndCache();
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

export function filterPagesByPath(pages: SleekSiteContent["pages"], path: string, options?: { collection?: boolean }): SleekSiteContent["pages"] {
  const pagesList = pages ?? [];
  return pagesList.filter((p) => {
    const pth = typeof p._path === "string" ? p._path : "";
    if (path && !pth.startsWith(path)) return false;
    if (options?.collection && !('_slug' in p)) return false;
    return true;
  });
}