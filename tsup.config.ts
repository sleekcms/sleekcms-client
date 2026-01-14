import { defineConfig } from 'tsup'

export default defineConfig([
  // Node.js builds (ESM + CJS)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    outExtension({ format }) {
      return {
        js: format === 'esm' ? '.mjs' : '.cjs'
      }
    }
  },
  // Browser builds (IIFE for CDN usage)
  {
    entry: ['src/index.ts'],
    format: ['iife'],
    globalName: 'SleekCMS',
    platform: 'browser',
    target: 'esnext',
    minify: false,
    sourcemap: true,
    outExtension() {
      return {
        js: '.global.js'
      }
    }
  },
  // Browser builds (minified)
  {
    entry: ['src/index.ts'],
    format: ['iife'],
    globalName: 'SleekCMS',
    platform: 'browser',
    target: 'esnext',
    minify: true,
    sourcemap: true,
    outExtension() {
      return {
        js: '.global.min.js'
      }
    }
  }
])
