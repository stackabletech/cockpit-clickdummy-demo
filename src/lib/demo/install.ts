// THROWAWAY POC: answer the app's API calls in the browser, so the static demo
// needs no backend. Everything that would change data opens the contact modal.

import { base } from '$app/paths';
import { openDemoGate } from './gate.svelte.js';
import { demoError, json, type DemoRequest } from './api/response.js';
import { trinoRoutes } from './api/trino.js';
import { storageRoutes } from './api/storage.js';

type Route = (req: DemoRequest) => Response | Promise<Response>;

/** Hosts of the example bookmarks and fixtures; they never resolve. */
const DEMO_HOST_SUFFIX = '.demo.example';

const routes: Record<string, Route> = {
  ...trinoRoutes,
  ...storageRoutes,
  // The session check of the session-expired modal: always signed in.
  '/api/auth/get-session': () =>
    json({ session: { id: 'demo-session' }, user: { id: 'demo-user' } })
};

function appPath(url: URL): string {
  return base && url.pathname.startsWith(base) ? url.pathname.slice(base.length) : url.pathname;
}

/** A form action, e.g. `POST /storage?/connect`. */
function isFormAction(url: URL, method: string): boolean {
  return method !== 'GET' && url.search.startsWith('?/');
}

function isGated(url: URL): boolean {
  const path = appPath(url);
  return path.startsWith('/auth/') || path.startsWith('/api/');
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = appPath(url);
  const route = routes[path];
  // Only reads are faked, apart from running and cancelling example queries.
  const readOnly = request.method === 'GET' || path === '/api/trino/query';
  if (route && readOnly) {
    return route({
      url,
      method: request.method,
      headers: request.headers,
      json: () => request.json()
    });
  }
  if (request.method === 'GET') {
    console.warn('[demo] no fixture for', path + url.search);
    return demoError(404);
  }
  openDemoGate();
  return demoError(403);
}

export function installDemo(): void {
  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== window.location.origin) return originalFetch(input, init);
    if (isFormAction(url, request.method)) {
      openDemoGate();
      // Stay on the page: an action result that "redirects" to where we are.
      return json({ type: 'redirect', status: 303, location: url.pathname });
    }
    if (appPath(url).startsWith('/api/')) return handle(request);
    return originalFetch(input, init);
  };

  // Logout, downloads and the example bookmarks would leave the static page.
  const onLinkClick = (event: MouseEvent) => {
    const anchor = (event.target as Element | null)?.closest?.('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const url = new URL(anchor.href);
    const sameOrigin = url.origin === window.location.origin;
    if (
      (sameOrigin && (isGated(url) || anchor.hasAttribute('download'))) ||
      url.hostname.endsWith(DEMO_HOST_SUFFIX)
    ) {
      event.preventDefault();
      event.stopPropagation();
      openDemoGate();
    }
  };
  document.addEventListener('click', onLinkClick, true);
  // Middle click opens a link in a new tab without a `click` event.
  document.addEventListener('auxclick', onLinkClick, true);
  document.addEventListener(
    'submit',
    (event) => {
      const form = event.target as HTMLFormElement;
      if (form.method.toLowerCase() === 'get') return;
      event.preventDefault();
      event.stopPropagation();
      openDemoGate();
    },
    true
  );
}
