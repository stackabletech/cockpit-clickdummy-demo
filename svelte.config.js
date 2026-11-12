import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// THROWAWAY POC: `npm run build:demo` builds a static demo without any backend.
const demo = process.env.VITE_COCKPIT_DEMO === 'true';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    adapter: demo
      ? adapterStatic({
          pages: 'build-demo',
          assets: 'build-demo',
          fallback: '404.html',
          strict: false
        })
      : adapterNode(),
    ...(demo && {
      // Path the website serves the demo under, e.g. `/cockpit-demo`.
      paths: { base: process.env.COCKPIT_DEMO_BASE_PATH ?? '' },
      prerender: {
        // No login or logout pages: the demo user is always signed in. The
        // storage browse route lists its own pages via `entries`.
        entries: ['/', '/trino', '/storage', '/settings/connections'],
        handleHttpError: 'warn',
        handleMissingId: 'warn',
        handleUnseenRoutes: 'ignore'
      }
    })
  }
};

export default config;
