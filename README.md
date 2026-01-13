# @sleekcms/client

Official JavaScript/TypeScript client for [SleekCMS](https://sleekcms.com) - a headless CMS that lets you manage content and deliver it via API.

Sign in at [sleekcms.com](https://sleekcms.com), create your content models, add your content, then grab your site token and use this library to integrate content in your apps.

## Installation

```bash
npm install @sleekcms/client
```

## Quick Start

```typescript
import { createSyncClient } from '@sleekcms/client';

const client = await createSyncClient({
  siteToken: 'your-site-token',
  env: 'latest'
});

// Get a page
const page = client.getPage('/about');

// Get all blog posts
const posts = client.getPages('/blog');

// Get an entry
const footer = client.getEntry('footer');
```

## Sync vs Async Clients

### Sync Client (Recommended for SSG)

**`createSyncClient()`** fetches all content upfront and returns a client with synchronous methods. Best for static site generation where you build once and want instant access to content.

```typescript
// Async initialization, sync usage
const client = await createSyncClient({
  siteToken: 'your-site-token'
});

// All methods return data immediately (no await)
const page = client.getPage('/pricing');
const slugs = client.getSlugs('/blog');
```

**Use when:**
- Building static sites (Next.js SSG, Astro, 11ty)
- You need all content at build time
- You want predictable performance

### Async Client (Recommended for SSR)

**`createAsyncClient()`** fetches content on-demand. Best for server-side rendering where you want fresh content per request without loading everything.

```typescript
const client = createAsyncClient({
  siteToken: 'your-site-token',
  resolveEnv: true  // optional: cache-friendly URLs
});

// All methods are async
const page = await client.getPage('/pricing');
const posts = await client.getPages('/blog');
```

**Use when:**
- Server-side rendering (Next.js SSR, SvelteKit, Remix)
- You only need specific content per request
- You want the latest content on each request

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `siteToken` | `string` | required | Your site token from SleekCMS |
| `env` | `string` | `'latest'` | Environment/alias name |
| `resolveEnv` | `boolean` | `false` | Env is an alias to version. This flag resolves env to version tag, so as to bypass CDN cache. Add's some latency.|
| `lang` | `string` | - | Language code for internationalized content |
| `cache` | `SyncCacheAdapter \| AsyncCacheAdapter` | In-memory cache | Custom cache adapter for storing fetched content |
| `cacheMinutes` | `number` | - | Cache expiration time in minutes. If not set, cache never expires |

**Internationalization Example:**

```typescript
// Fetch Spanish content
const client = await createSyncClient({
  siteToken: 'your-site-token',
  lang: 'es'
});

const page = client.getPage('/about');
// Returns Spanish version of the page
```

## Caching

The client includes built-in caching support to improve performance and reduce API calls. By default, an in-memory cache is used, but you can provide your own cache adapter.

### Default In-Memory Cache

```typescript
const client = await createSyncClient({
  siteToken: 'your-site-token'
});
// Uses built-in memory cache automatically
```

### Using localStorage

```typescript
const client = await createSyncClient({
  siteToken: 'your-site-token',
  cache: localStorage,  // Use browser's localStorage
  cacheMinutes: 60*24      // Cache expires after 1 day
});
```

### Cache Adapter Interface

Any object with `getItem` and `setItem` methods works as a cache adapter:

```typescript
// Synchronous cache adapter
interface SyncCacheAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Asynchronous cache adapter
interface AsyncCacheAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
```

### Cache Expiration

Use `cacheMinutes` to set when cached content expires:

```typescript
const client = await createSyncClient({
  siteToken: 'your-site-token',
  cache: localStorage,
  cacheMinutes: 60*24  // Cache expires after 1 day
});
```

If `cacheMinutes` is not set, cached content never expires (until cleared manually).

## API Reference

### `getContent(search?)`

Get all content or use a [JMESPath](https://jmespath.org/) search/query to filter it.

```typescript
// Get everything
const content = client.getContent();

// Get only pages using JMESPath
const pages = client.getContent('pages');

// Get config title
const title = client.getContent('config.title');
```

### `getPages(path)`

Get all pages that start with a specific path.

```typescript
const posts = client.getPages('/blog');
const products = client.getPages('/shop/products');
```

### `getPage(path)`

Get a single page by exact path. Returns `null` if not found.

```typescript
const about = client.getPage('/about');
const post = client.getPage('/blog/hello-world');
```

### `getEntry(handle)`

Get an entry by handle. Entries can be single objects or arrays.

```typescript
const header = client.getEntry('header');
const team = client.getEntry('team-members'); // could be an array
```

### `getSlugs(path)`

Extract slugs from pages under a path. Useful for static site generation.

```typescript
const slugs = client.getSlugs('/blog');
// ['hello-world', 'nextjs-tips', 'typescript-guide']
```

### `getImage(name)`

Get an image by name.

```typescript
const logo = client.getImage('logo');
// { url: 'https://...', alt: '...', ... }
```

### `getOptions(name)`

Get a option set (array of label/value pairs).

```typescript
const categories = client.getOptions('categories');
// [{ label: 'Tech', value: 'tech' }, ...]
```

## Framework Examples

### Next.js App Router (SSG)

```typescript
// app/blog/page.tsx
import { createSyncClient } from '@sleekcms/client';

export default async function BlogPage() {
  const client = await createSyncClient({
    siteToken: process.env.SLEEKCMS_SITE_TOKEN!
  });

  const posts = client.getPages('/blog');

  return (
    <div>
      {posts?.map((post) => (
        <article key={post._path}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </div>
  );
}
```

### Generate Static Paths

```typescript
// app/blog/[slug]/page.tsx
import { createSyncClient } from '@sleekcms/client';

export async function generateStaticParams() {
  const client = await createSyncClient({
    siteToken: process.env.SLEEKCMS_SITE_TOKEN!
  });

  const slugs = client.getSlugs('/blog');

  return slugs.map((slug) => ({ slug }));
}

export default async function Post({ params }: { params: { slug: string } }) {
  const client = await createSyncClient({
    siteToken: process.env.SLEEKCMS_SITE_TOKEN!
  });

  const post = client.getPage(`/blog/${params.slug}`);

  return <h1>{post?.title}</h1>;
}
```

### SvelteKit (SSR)

```typescript
// +page.server.ts
import { createAsyncClient } from '@sleekcms/client';

const client = createAsyncClient({
  siteToken: process.env.SLEEKCMS_SITE_TOKEN,
  resolveEnv: true
});

export async function load() {
  const posts = await client.getPages('/blog');
  return { posts };
}
```

### Astro

```astro
---
// src/pages/blog/index.astro
import { createSyncClient } from '@sleekcms/client';

const client = await createSyncClient({
  siteToken: import.meta.env.SLEEKCMS_SITE_TOKEN
});

const posts = client.getPages('/blog');
---

<div>
  {posts?.map((post) => (
    <article>
      <h2>{post.title}</h2>
    </article>
  ))}
</div>
```

## TypeScript

The client is fully typed:

```typescript
import type { 
  SleekClient, 
  SleekAsyncClient,
  Page,
  Entry,
  Image,
  Options 
} from '@sleekcms/client';
```

## License

MIT
