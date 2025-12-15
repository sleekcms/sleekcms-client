import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient, createSyncClient } from "../src/index";
import type { SleekSiteContent } from "../src/types";

// Mock data
const mockSiteContent: SleekSiteContent = {
  pages: [
    { _path: "/", title: "Home", published: true },
    { _path: "/blog/post-1", title: "Post 1", published: true, category: "tech" },
    { _path: "/blog/post-2", title: "Post 2", published: false, category: "tech" },
    { _path: "/about", title: "About", published: true }
  ],
  images: {
    logo: { url: "https://example.com/logo.png", width: 200, height: 100 },
    hero: { url: "https://example.com/hero.jpg", width: 1200, height: 600 }
  },
  lists: {
    categories: [
      { label: "Technology", value: "tech" },
      { label: "Business", value: "business" }
    ]
  },
  config: {
    title: "Test Site"
  }
};

describe("SleekCMS Client", () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Search Query Functionality", () => {
    it("should send search query as URL parameter when query is provided", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ["Post 1", "Post 2"]
      });

      const client = createClient({
        siteToken: "prod-site123"
      });

      const result = await client.getContent('pages[?published == `true`]');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain("search=");
      expect(calledUrl).toContain('pages');
      expect(calledUrl).toContain('published');
    });

    it("should apply JMESPath query on server-side with search parameter", async () => {
      const filteredPages = [
        { _path: "/", title: "Home", published: true },
        { _path: "/about", title: "About", published: true }
      ];

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => filteredPages
      });

      const client = createClient({
        siteToken: "prod-site123"
      });

      const result = await client.getContent('pages[?published == `true`]');

      expect(result).toEqual(filteredPages);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should apply local JMESPath query in cache mode", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "prod-site123",
        cache: true
      });

      // First call to load cache
      const allContent = await client.getContent();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call with query should use local cache
      const pages = await client.getContent<any[]>('pages');
      expect(fetchSpy).toHaveBeenCalledTimes(1); // No additional fetch
      expect(pages).toHaveLength(4);
      expect(pages).toEqual(mockSiteContent.pages);
    });

    it("should handle complex JMESPath queries with getPages", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "prod-site123",
        cache: true
      });

      await client.getContent(); // Load cache

      const result = await client.getPages(
        "/blog",
        "[?published == `true`].title"
      );

      expect(result).toEqual(["Post 1"]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Cache Behavior - Async Client", () => {
    it("should fetch full content once when cache is true", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "prod-site123",
        cache: true
      });

      // First call
      const content1 = await client.getContent();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(content1).toEqual(mockSiteContent);

      // Second call should use cache
      const content2 = await client.getContent();
      expect(fetchSpy).toHaveBeenCalledTimes(1); // No additional fetch
      expect(content2).toEqual(mockSiteContent);
    });

    it("should use cached data for all methods after initial fetch", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "prod-site123",
        cache: true
      });

      // Initial fetch
      await client.getContent();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // All subsequent calls should use cache
      const images = await client.getImages();
      expect(images).toEqual(mockSiteContent.images);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const logo = await client.getImage("logo");
      expect(logo).toEqual(mockSiteContent.images!.logo);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const list = await client.getList("categories");
      expect(list).toEqual(mockSiteContent.lists!.categories);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const pages = await client.getPages("/blog");
      expect(pages).toHaveLength(2);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should enable cache automatically with mock=true and dev token", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "dev-site123",
        mock: true
      });

      // First call
      await client.getContent();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call should use cache (auto-enabled due to mock + dev)
      await client.getContent();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should fetch on each call when cache is false and query is provided", async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSiteContent.pages
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ _path: "/new", title: "New Page" }]
        });

      const client = createClient({
        siteToken: "prod-site123",
        cache: false
      });

      const pages1 = await client.getContent('pages');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(Array.isArray(pages1)).toBe(true);

      const pages2 = await client.getContent('pages');
      expect(fetchSpy).toHaveBeenCalledTimes(2); // New fetch
      expect(pages2).toEqual([{ _path: "/new", title: "New Page" }]);
    });

    it("should enable caching after first getContent() call without query", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "prod-site123",
        cache: false
      });

      // First call without query enables cache
      await client.getContent();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Subsequent calls use cache
      await client.getImages();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      await client.getList("categories");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should apply JMESPath queries locally when cache is enabled", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "prod-site123",
        cache: true
      });

      // Load cache
      await client.getContent();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Query should be applied locally
      const publishedPages = await client.getContent<any[]>(
        'pages[?published == `true`]'
      );
      expect(publishedPages).toHaveLength(3);
      expect(publishedPages.every((p: any) => p.published === true)).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1); // No additional fetch
    });

    it("should handle concurrent requests with cache enabled", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "prod-site123",
        cache: true
      });

      // Multiple concurrent requests - may fetch multiple times initially
      // but should eventually use cache
      const [content1, content2, content3] = await Promise.all([
        client.getContent(),
        client.getContent(),
        client.getContent()
      ]);

      expect(content1).toEqual(mockSiteContent);
      expect(content2).toEqual(mockSiteContent);
      expect(content3).toEqual(mockSiteContent);
    });
  });

  describe("Sync Client", () => {
    it("should prefetch all content and work synchronously", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = await createSyncClient({
        siteToken: "prod-site123"
      });

      // Initial fetch during creation
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // All methods are synchronous and use cached data
      const content = client.getContent();
      expect(content).toEqual(mockSiteContent);

      const images = client.getImages();
      expect(images).toEqual(mockSiteContent.images);

      const pages = client.getPages("/blog");
      expect(pages).toHaveLength(2);

      // Still only one fetch
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("getPage Method", () => {
    it("should get a single page by exact path - async client", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "prod-site123",
        cache: true
      });

      const page = await client.getPage("/about");
      expect(page).toEqual({ _path: "/about", title: "About", published: true });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should throw error when page not found - async client", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "prod-site123",
        cache: true
      });

      await expect(client.getPage("/nonexistent")).rejects.toThrow(
        "[SleekCMS] Page not found: /nonexistent"
      );
    });

    it("should get a single page by exact path - sync client", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = await createSyncClient({
        siteToken: "prod-site123"
      });

      const page = client.getPage("/blog/post-1");
      expect(page).toEqual({
        _path: "/blog/post-1",
        title: "Post 1",
        published: true,
        category: "tech"
      });
    });

    it("should return null when page not found - sync client", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = await createSyncClient({
        siteToken: "prod-site123"
      });

      const page = client.getPage("/nonexistent");
      expect(page).toBeNull();
    });

    it("should throw error when path is empty", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "prod-site123",
        cache: true
      });

      await expect(client.getPage("")).rejects.toThrow(
        "[SleekCMS] path is required for getPage"
      );
    });
  });

  describe("devEnv Client Option", () => {
    it("should use production URL when devEnv is 'production'", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "dev-site123",
        devEnv: "production"
      });

      await client.getContent();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain("sleekcms.com");
      expect(calledUrl).toContain("dev.sleekcms.com/site123");
    });

    it("should use development URL when devEnv is 'development'", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "dev-site123",
        devEnv: "development"
      });

      await client.getContent();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain("sleekcms.net");
      expect(calledUrl).toContain("dev.sleekcms.net/site123");
    });

    it("should use localhost URL when devEnv is 'localhost'", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "dev-site123",
        devEnv: "localhost"
      });

      await client.getContent();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain("localhost:9001");
      expect(calledUrl).toContain("localhost:9001/dev/site123");
    });

    it("should default to production URL when devEnv is not specified", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSiteContent
      });

      const client = createClient({
        siteToken: "dev-site123"
      });

      await client.getContent();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain("sleekcms.com");
    });

    it("should throw error when devEnv is invalid", async () => {
      const client = createClient({
        siteToken: "dev-site123",
        devEnv: "invalid" as any
      });

      await expect(client.getContent()).rejects.toThrow(
        "[SleekCMS] Unknown devEnv: invalid"
      );
    });
  });

  describe("Error Handling", () => {
    it("should throw error when siteToken is missing", async () => {
      const client = createClient({
        siteToken: ""
      });

      await expect(client.getContent()).rejects.toThrow(
        "[SleekCMS] siteToken is required"
      );
    });

    it("should handle HTTP errors gracefully", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: "Site not found" })
      });

      const client = createClient({
        siteToken: "prod-invalid"
      });

      await expect(client.getContent()).rejects.toThrow(
        "[SleekCMS] Request failed (404): Site not found"
      );
    });
  });
});
