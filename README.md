# SleekCMS Client

Official JavaScript/TypeScript client library for [SleekCMS](https://sleekcms.com) - a modern headless CMS.

## Installation

```bash
npm install @sleekcms/client
```

## Quick Start

```typescript
import { createClient } from '@sleekcms/client';

const client = createClient({
  siteToken: 'your-site-token',
  env: 'latest', // optional: default 'latest'. Ignored for dev- tokens
});

// Fetch all content
const content = await client.getContent();

// Get specific pages
const blogPosts = await client.getPages('/blog');
```

## Client Types

### Async Client (Recommended)

The default client that fetches content on-demand. Ideal for server-side rendering and applications where you want fresh content on each request.

```typescript
import { createClient } from '@sleekcms/client';

const client = createClient({
  siteToken: 'your-site-token',
  env: 'latest',
  cache: false, // optional: enable in-memory caching
  mock: false,  // optional: use mock data (dev tokens only)
});
```

### Sync Client

Prefetches all content once and provides synchronous methods. Perfect for static site generation and client-side applications.

```typescript
import { createSyncClient } from '@sleekcms/client';

// Note: createSyncClient is async, but returns a sync client
const client = await createSyncClient({
  siteToken: 'your-site-token',
  env: 'latest',
});

// All methods are now synchronous
const content = client.getContent();
const images = client.getImages();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `siteToken` | `string` | *required* | Your SleekCMS site token |
| `env` | `string` | `'latest'` | Environment: default is `'latest'`. Ignored for dev- tokens
| `cache` | `boolean` | `false` | Enable in-memory caching for async client |
| `mock` | `boolean` | `false` | Use mock data (only works with dev tokens) |

## API Methods

### `getContent<T>(query?)`

Fetch the entire site content or filter it using a JMESPath query.

**Parameters:**
- `query` (optional): JMESPath query string to filter/transform content

**Returns:** `Promise<T>` (async) or `T` (sync)

**Examples:**

```typescript
// Get all content
const content = await client.getContent();

// Get only pages
const pages = await client.getContent('pages');

// Get specific page by path
const homePage = await client.getContent('pages[?_path == `/`] | [0]');

// Get config title
const siteTitle = await client.getContent<string>('config.title');
```

### `getPages(path, query?)`

Get pages that start with the specified path.

**Parameters:**
- `path` (required): Path prefix to filter pages (e.g., `/blog`, `/products`)
- `query` (optional): JMESPath query to further filter results

**Returns:** `Promise<SleekSiteContent["pages"]>` (async) or `SleekSiteContent["pages"]` (sync)

**Examples:**

```typescript
// Get all blog posts
const blogPosts = await client.getPages('/blog');

// Get blog posts with custom query
const publishedPosts = await client.getPages(
  '/blog',
  '[?published == `true`]'
);

// Get post titles only
const titles = await client.getPages('/blog', '[].title');
```

### `getPage(path)`

Get a single page by its exact path.

**Parameters:**
- `path` (required): Exact page path (e.g., `/blog/my-post`, `/about`)

**Returns:** `Promise<Page>` (async) or `Page | null` (sync)

**Note:** Async client throws an error if page is not found. Sync client returns `null`.

**Examples:**

```typescript
// Async client - throws if not found
try {
  const aboutPage = await client.getPage('/about');
  console.log(aboutPage.title);
} catch (error) {
  console.error('Page not found');
}

// Sync client - returns null if not found
const syncClient = await createSyncClient({ siteToken: '...' });
const aboutPage = syncClient.getPage('/about');
if (aboutPage) {
  console.log(aboutPage.title);
}
```

### `getImages()`

Retrieve all images from the CMS.

**Returns:** `Promise<Record<string, Image>>` (async) or `Record<string, Image>` (sync)

**Example:**

```typescript
const images = await client.getImages();
// { "logo": { url: "https://...", ... }, ... }
```

### `getImage(name)`

Get a specific image by name.

**Parameters:**
- `name` (required): Image name/key

**Returns:** `Promise<Image | undefined>` (async) or `Image | undefined` (sync)

**Example:**

```typescript
const logo = await client.getImage('logo');
// { url: "https://...", width: 200, height: 100, ... }
```

### `getList<T>(name)`

Retrieve a specific list (e.g., dropdown options, categories).

**Parameters:**
- `name` (required): List name

**Returns:** `Promise<T[] | undefined>` (async) or `T[] | undefined` (sync)

**Example:**

```typescript
const categories = await client.getList('categories');
// [{ label: "Technology", value: "tech" }, ...]
```

### `getSlugs(path)`

Get an array of slugs from pages that start with the specified path. Only includes pages that have a `_slug` property.

**Parameters:**
- `path` (required): Path prefix to filter pages (e.g., `/blog`, `/products`)

**Returns:** `Promise<string[]>` (async) or `string[]` (sync)

**Example:**

```typescript
// Get all blog post slugs
const slugs = await client.getSlugs('/blog');
// ["my-first-post", "second-post", "latest-update"]

// Useful for generating static paths in Next.js
const productSlugs = await client.getSlugs('/products');
// ["laptop", "keyboard", "mouse"]
```

## Content Structure

The SleekCMS content has the following structure:

```typescript
interface SleekSiteContent {
  entries?: Record<string, Entry> | Record<string, Entry[]>;
  pages?: Array<{
    _path: string;
    [key: string]: unknown;
  }>;
  images?: Record<string, {
    url: string;
    [key: string]: unknown;
  }>;
  lists?: Record<string, Array<{
    label: string;
    value: string;
  }>>;
  config?: {
    title?: string;
  };
}
```

## JMESPath Queries

All methods support optional JMESPath queries for powerful data filtering and transformation. Learn more at [JMESPath.org](https://jmespath.org/).

**Common patterns:**

```typescript
// Filter array
'pages[?published == `true`]'

// Get first item
'pages[0]'

// Project specific fields
'pages[].{title: title, path: _path}'

// Sort results
'sort_by(pages, &date)'

// Nested queries
'pages[?category == `blog`].{title: title, image: images.hero.url}'
```

## Usage Examples

### Next.js (App Router)

```typescript
import { createClient } from '@sleekcms/client';

export default async function BlogPage() {
  const client = createClient({
    siteToken: process.env.SLEEKCMS_TOKEN!,
    env: 'published',
  });

  const posts = await client.getPages('/blog');

  return (
    <div>
      {posts.map((post: any) => (
        <article key={post._path}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
```

### Static Site Generation

```typescript
import { createSyncClient } from '@sleekcms/client';

// At build time
const client = await createSyncClient({
  siteToken: process.env.SLEEKCMS_TOKEN!,
  env: 'published',
});

// Generate static pages
const pages = client.getPages('/');
const images = client.getImages();

// All subsequent calls are synchronous and instant
```

### Next.js Static Params (generateStaticParams)

Use `getSlugs()` to generate static paths for dynamic routes in Next.js:

```typescript
// app/blog/[slug]/page.tsx
import { createClient } from '@sleekcms/client';

// Generate static paths at build time
export async function generateStaticParams() {
  const client = createClient({
    siteToken: process.env.SLEEKCMS_TOKEN!,
    env: 'published',
  });

  const slugs = await client.getSlugs('/blog');

  return slugs.map((slug) => ({
    slug: slug,
  }));
}

// Render the page
export default async function BlogPost({ params }: { params: { slug: string } }) {
  const client = createClient({
    siteToken: process.env.SLEEKCMS_TOKEN!,
    env: 'published',
  });

  const post = await client.getPage(`/blog/${params.slug}`);

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

**Pages Router Example:**

```typescript
// pages/blog/[slug].tsx
import { createClient } from '@sleekcms/client';
import type { GetStaticPaths, GetStaticProps } from 'next';

export const getStaticPaths: GetStaticPaths = async () => {
  const client = createClient({
    siteToken: process.env.SLEEKCMS_TOKEN!,
    env: 'published',
  });

  const slugs = await client.getSlugs('/blog');

  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const client = createClient({
    siteToken: process.env.SLEEKCMS_TOKEN!,
    env: 'published',
  });

  const post = await client.getPage(`/blog/${params!.slug}`);

  return {
    props: { post },
  };
};

export default function BlogPost({ post }: any) {
  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

### Browser Usage

```typescript
import { createClient } from '@sleekcms/client';

const client = createClient({
  siteToken: 'your-public-token',
  cache: true, // Enable caching for better performance
});

// Fetch data on mount
async function loadContent() {
  const content = await client.getContent();
  // Subsequent calls will use cache
}
```

## Caching Behavior

### Async Client
- By default, each call fetches fresh data
- Set `cache: true` to enable in-memory caching
- First call fetches data, subsequent calls use cache
- When using `mock: true` with dev tokens, caching is automatic

### Sync Client
- Always caches content on initialization
- All methods are synchronous and use cached data
- No network requests after initial fetch

## Error Handling

```typescript
try {
  const content = await client.getContent();
} catch (error) {
  // Error format: [SleekCMS] <message>
  console.error(error.message);
}
```

## TypeScript Support

Fully typed with TypeScript. Import types for better IDE support:

```typescript
import type { SleekSiteContent, ClientOptions } from '@sleekcms/client';

// Type your content
interface BlogPost {
  title: string;
  excerpt: string;
  _path: string;
}

const posts = await client.getPages('/blog');

// Get a single page with error handling
const aboutPage = await client.getPage('/about');
```

## License

MIT

## Links

- [SleekCMS Website](https://sleekcms.com)
- [Documentation](https://docs.sleekcms.com)
- [GitHub Repository](https://github.com/sleekcms/sleekcms-client)
