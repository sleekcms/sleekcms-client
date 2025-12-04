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
const blogPosts = await client.findPages('/blog');
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

### `findPages<T>(path, query?)`

Find pages that start with the specified path.

**Parameters:**
- `path` (required): Path prefix to filter pages (e.g., `/blog`, `/products`)
- `query` (optional): JMESPath query to further filter results

**Returns:** `Promise<T>` (async) or `T` (sync)

**Examples:**

```typescript
// Get all blog posts
const blogPosts = await client.findPages('/blog');

// Get blog posts with custom query
const publishedPosts = await client.findPages(
  '/blog',
  '[?published == `true`]'
);

// Get post titles only
const titles = await client.findPages('/blog', '[].title');
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

  const posts = await client.findPages('/blog');

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
const pages = client.findPages('/');
const images = client.getImages();

// All subsequent calls are synchronous and instant
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

const posts = await client.findPages<BlogPost[]>('/blog');
```

## License

MIT

## Links

- [SleekCMS Website](https://sleekcms.com)
- [Documentation](https://docs.sleekcms.com)
- [GitHub Repository](https://github.com/sleekcms/sleekcms-client)
