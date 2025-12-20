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

      result = client.getList("categories");
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
        siteToken: "prod-site123"
      });
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent.pages });
      let result = await client.getPages();
      expect(result).toEqual(mockSiteContent.pages);

      result = await client.getPages("/blog");
      expect(result.length).toBe(2);

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

      result = await client.getList("categories");
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

      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockSiteContent.lists });
      result = await client.getList("categories");
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
