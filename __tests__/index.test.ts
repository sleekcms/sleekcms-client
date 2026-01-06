import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient, createAsyncClient } from "../src/index";
import type { SleekSiteContent } from "../src/types";

// Mock data
const mockSiteContent: SleekSiteContent = {
  entries: {
    foo: { title: "Foo Entry", content: "This is foo." },
    bar: [
      { title: "Bar Entry 1", content: "This is bar 1." },
      { title: "Bar Entry 2", content: "This is bar 2." }
    ]
  },
  pages: [
    { _path: "/", title: "Home", published: true },
    { _path: "/blog/post-1", _slug: "post-1", title: "Post 1", published: true, category: "tech" },
    { _path: "/blog/post-2", _slug: "post-2", title: "Post 2", published: false, category: "tech" },
    { _path: "/about", title: "About", published: true }
  ],
  images: {
    logo: { url: "https://example.com/logo.png", width: 200, height: 100 },
    hero: { url: "https://example.com/hero.jpg", width: 1200, height: 600 }
  },
  options: {
    categories: [
      { label: "Technology", value: "tech" },
      { label: "Business", value: "business" }
    ]
  },
  config: {
    title: "Test Site"
  }
};

describe("SleekCMS Sync Client", () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Sync Client", () => {
    it("should fetch full content and resolve locally", async () => {
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent });

      const client = await createClient({
        siteToken: "prod-site123"
      });

      let result = client.getContent() as any;
      expect(result).toEqual(mockSiteContent);
      
      result = client.getPages("/blog");
      expect(result.length).toBe(2);

      result = client.getPage("/about");
      expect(result).toEqual({ _path: "/about", title: "About", published: true });

      result = client.getEntry("foo");
      expect(result).toEqual({ title: "Foo Entry", content: "This is foo." });

      result = client.getOptionSet("categories");
      expect(result.length).toBe(2);

      result = client.getImage("logo");
      expect(result).toEqual({ url: "https://example.com/logo.png", width: 200, height: 100 });

      result = client.getSlugs("/blog");
      expect(result).toEqual(["post-1", "post-2"]);

      result = client.getContent("pages[]._path");
      expect(result).toEqual(["/", "/blog/post-1", "/blog/post-2", "/about"]);

    });

    it("should handle when cdn is true", async () => {
      fetchSpy
        .mockResolvedValueOnce({ ok: true, json: async () => ({ tag: "abcdefgh" }) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent });

      const client = await createClient({
        siteToken: "prod-site123",
        cdn: true
      });

      let result = client.getContent() as any;
      expect(result).toEqual(mockSiteContent);

    })
  })

});

describe("SleekCMS Async Client", () => {
  let fetchSpy: any;
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Async Client", () => {
    it("should cache getContent", async () => {

      const client = createAsyncClient({
        siteToken: "prod-site123"
      });

      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ test: 1}) });

      let result = await client.getContent();
      expect(result).toEqual({ test: 1 });

      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ test: 2}) });
      result = await client.getContent(); // should use cache
      expect(result).toEqual({ test: 1 });

    });

    it("should cache pages", async () => {
      const client = createAsyncClient({
        siteToken: "pub-site123"
      });
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent.pages });
      let result = await client.getPages();
      expect(result).toEqual(mockSiteContent.pages);

      result = await client.getPages("/blog");
      expect(result.length).toBe(2);

      let apiEndpoint = client._getFetchUrl();
      expect(apiEndpoint).toBe("https://pub.sleekcms.com/site123/latest");

    })

    it("all methods work after get all", async () => {
      const client = createAsyncClient({
        siteToken: "prod-site123",
        env: "staging"
      });
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent });

      let result = await client.getContent() as any;
      expect(result).toEqual(mockSiteContent);
      
      result = await client.getPages("/blog");
      expect(result.length).toBe(2);

      result = await client.getPage("/about");
      expect(result).toEqual({ _path: "/about", title: "About", published: true });

      result = await client.getEntry("foo");
      expect(result).toEqual({ title: "Foo Entry", content: "This is foo." });

      result = await client.getOptionSet("categories");
      expect(result.length).toBe(2);

      result = await client.getImage("logo");
      expect(result).toEqual({ url: "https://example.com/logo.png", width: 200, height: 100 });

      result = await client.getSlugs("/blog");
      expect(result).toEqual(["post-1", "post-2"]);

      result = await client.getContent("pages[]._path");
      expect(result).toEqual(["/", "/blog/post-1", "/blog/post-2", "/about"]);      

    })

    it("all methods work with active fetch", async () => {
      const client = createAsyncClient({
        siteToken: "prod-site123",
        env: "staging"
      });
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent.images?.logo });

      let result = await client.getContent('images.logo') as any;
      expect(result).toEqual(mockSiteContent.images?.logo);
      
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent.pages });
      result = await client.getPages("/blog");
      expect(result.length).toBe(2);

      result = await client.getPage("/about");
      expect(result).toEqual({ _path: "/about", title: "About", published: true });

      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent.entries?.foo });
      result = await client.getEntry("foo");
      expect(result).toEqual({ title: "Foo Entry", content: "This is foo." });

      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent.options });
      result = await client.getOptionSet("categories");
      expect(result.length).toBe(2);

      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent.images });
      result = await client.getImage("logo");
      expect(result).toEqual({ url: "https://example.com/logo.png", width: 200, height: 100 });

      result = await client.getSlugs("/blog");
      expect(result).toEqual(["post-1", "post-2"]);

      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ['foo'] });
      result = await client.getContent("pages[]._path");
      expect(result).toEqual(["foo"]);      
    })
  })
});

describe("Custom Cache Adapters", () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should work with sync cache adapter", async () => {
    const cache = new Map<string, string>();
    const syncCache = {
      getItem: (key: string) => cache.get(key) ?? null,
      setItem: (key: string, value: string) => cache.set(key, value)
    };

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent });

    const client = await createClient({
      siteToken: "prod-site123",
      cache: syncCache
    });

    const result = client.getContent() as any;
    expect(result).toEqual(mockSiteContent);
    
    // Verify cache was populated
    expect(cache.size).toBeGreaterThan(0);
    
    // Create another client with same cache - should use cached data
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ different: "data" }) });
    
    const client2 = await createClient({
      siteToken: "prod-site123",
      cache: syncCache
    });

    const result2 = client2.getContent() as any;
    expect(result2).toEqual(mockSiteContent); // Should be same as first fetch
  });

  it("should work with async cache adapter", async () => {
    const cache = new Map<string, string>();
    const asyncCache = {
      getItem: async (key: string) => cache.get(key) ?? null,
      setItem: async (key: string, value: string) => { cache.set(key, value); }
    };

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent });

    const client = await createClient({
      siteToken: "prod-site123",
      cache: asyncCache
    });

    const result = client.getContent() as any;
    expect(result).toEqual(mockSiteContent);
    
    // Verify cache was populated
    expect(cache.size).toBeGreaterThan(0);
    
    // Create another client with same cache - should use cached data
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ different: "data" }) });
    
    const client2 = await createClient({
      siteToken: "prod-site123",
      cache: asyncCache
    });

    const result2 = client2.getContent() as any;
    expect(result2).toEqual(mockSiteContent); // Should be same as first fetch
  });

  it("should respect cache expiration", async () => {
    const cache = new Map<string, string>();
    const syncCache = {
      getItem: (key: string) => cache.get(key) ?? null,
      setItem: (key: string, value: string) => cache.set(key, value)
    };

    // First fetch
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent });

    const client = await createClient({
      siteToken: "prod-site123",
      cache: syncCache,
      cacheMinutes: 1 // 1 minute expiry
    });

    let result = client.getContent() as any;
    expect(result).toEqual(mockSiteContent);
    
    // Verify cache was populated with timestamp
    expect(cache.size).toBeGreaterThan(0);
    const cachedValue = cache.values().next().value;
    expect(cachedValue).toBeDefined();
    const parsed = JSON.parse(cachedValue!);
    expect(parsed._ts).toBeDefined();
    expect(parsed.data).toBeDefined();
    
    // Immediately fetch again - should use cache, no fetch should happen
    const client2 = await createClient({
      siteToken: "prod-site123",
      cache: syncCache,
      cacheMinutes: 1
    });

    result = client2.getContent() as any;
    expect(result).toEqual(mockSiteContent); // Should still be cached
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Only the first fetch
    
    // Manually expire cache by modifying timestamp
    parsed._ts = Date.now() - (2 * 60 * 1000); // 2 minutes ago
    cache.set(Array.from(cache.keys())[0], JSON.stringify(parsed));
    
    // Now fetch again - should get new data
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ fresh: "data" }) });
    
    const client3 = await createClient({
      siteToken: "prod-site123",
      cache: syncCache,
      cacheMinutes: 1
    });

    result = client3.getContent() as any;
    expect(result).toEqual({ fresh: "data" }); // Should be new data
    expect(fetchSpy).toHaveBeenCalledTimes(2); // Second fetch happened
  });

  it("should work with async client and custom cache", async () => {
    const cache = new Map<string, string>();
    const asyncCache = {
      getItem: async (key: string) => cache.get(key) ?? null,
      setItem: async (key: string, value: string) => { cache.set(key, value); }
    };

    const client = createAsyncClient({
      siteToken: "prod-site123",
      cache: asyncCache
    });

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent.pages });

    let result = await client.getPages("/blog");
    expect(result.length).toBe(2);
    
    // Verify cache was populated
    expect(cache.size).toBeGreaterThan(0);
    
    // Fetch again - should use cache
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => [] });
    result = await client.getPages("/blog");
    expect(result.length).toBe(2); // Should still be 2 from cache
  });

  it("should handle faulty cache getter gracefully", async () => {
    const faultyCache = {
      getItem: (key: string) => {
        throw new Error("Cache read error");
      },
      setItem: (key: string, value: string) => {}
    };

    // Should still work despite cache errors
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent });

    const client = await createClient({
      siteToken: "prod-site123",
      cache: faultyCache
    });

    const result = client.getContent() as any;
    expect(result).toEqual(mockSiteContent); // Should get data from fetch
  });

  it("should handle faulty cache setter gracefully", async () => {
    const faultyCache = {
      getItem: (key: string) => null,
      setItem: (key: string, value: string) => {
        throw new Error("Cache write error");
      }
    };

    // Should still work despite cache write errors
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent });

    const client = await createClient({
      siteToken: "prod-site123",
      cache: faultyCache
    });

    const result = client.getContent() as any;
    expect(result).toEqual(mockSiteContent); // Should get data from fetch
  });

  it("should handle async cache errors gracefully", async () => {
    const faultyAsyncCache = {
      getItem: async (key: string) => {
        throw new Error("Async cache read error");
      },
      setItem: async (key: string, value: string) => {
        throw new Error("Async cache write error");
      }
    };

    // Should still work despite async cache errors
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent });

    const client = await createClient({
      siteToken: "prod-site123",
      cache: faultyAsyncCache
    });

    const result = client.getContent() as any;
    expect(result).toEqual(mockSiteContent); // Should get data from fetch
  });

  it("should handle corrupted cache data gracefully", async () => {
    const corruptedCache = {
      getItem: (key: string) => "this is not valid JSON{[",
      setItem: (key: string, value: string) => {}
    };

    // Should fetch fresh data when cache data is corrupted
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent });

    const client = await createClient({
      siteToken: "prod-site123",
      cache: corruptedCache
    });

    const result = client.getContent() as any;
    expect(result).toEqual(mockSiteContent); // Should get data from fetch
  });
});
