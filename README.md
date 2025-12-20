# SleekCMS Client

Official JavaScript/TypeScript client for [SleekCMS](https://sleekcms.com) - a headless CMS that lets you manage content and deliver it via API.

## Installation

```bash
npm install @sleekcms/client
```

## Quick Start

```typescript
import { createClient } from '@sleekcms/client';

const client = await createClient({
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

**`createClient()`** fetches all content upfront and returns a client with synchronous methods. Best for static site generation where you build once and want instant access to content.

```typescript
// Async initialization, sync usage
const client = await createClient({
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
  cdn: true  // optional: cache-friendly URLs
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
| `cdn` | `boolean` | `false` | Resolve env name to bypass CDN cache. Adds latency. |
| `lang` | `string` | - | Language code for internationalized content (e.g., `'en'`, `'es'`, `'fr'`) |

**Internationalization Example:**

```typescript
// Fetch Spanish content
const client = await createClient({
  siteToken: 'your-site-token',
  lang: 'es'
});

const page = client.getPage('/about');
// Returns Spanish version of the page
```

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

### `getList(name)`

Get a list (array of label/value pairs).

```typescript
const categories = client.getList('categories');
// [{ label: 'Tech', value: 'tech' }, ...]
```

## Framework Examples

### Next.js App Router (SSG)

```typescript
// app/blog/page.tsx
import { createClient } from '@sleekcms/client';

export default async function BlogPage() {
  const client = await createClient({
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
import { createClient } from '@sleekcms/client';

export async function generateStaticParams() {
  const client = await createClient({
    siteToken: process.env.SLEEKCMS_SITE_TOKEN!
  });

  const slugs = client.getSlugs('/blog');

  return slugs.map((slug) => ({ slug }));
}

export default async function Post({ params }: { params: { slug: string } }) {
  const client = await createClient({
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
  cdn: true
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
import { createClient } from '@sleekcms/client';

const client = await createClient({
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
  List 
} from '@sleekcms/client';
```

## License

MIT
