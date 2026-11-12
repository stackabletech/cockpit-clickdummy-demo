import type { ClientInit } from '@sveltejs/kit';
import { checkSession } from '$lib/client/session.svelte';
import { DEMO } from '$lib/demo/flag';

/**
 * Wrap `window.fetch` so that any same-origin 401 triggers a session check.
 * A 401 does not always mean the session has expired (e.g. the storage API
 * uses it for a missing connection), so the response itself is passed through
 * unchanged and `checkSession` decides whether the session is really gone.
 */
export const init: ClientInit = async () => {
  // THROWAWAY POC: the static demo answers the API in the browser instead.
  if (DEMO) {
    const { installDemo } = await import('$lib/demo/install');
    installDemo();
    return;
  }
  const originalFetch = window.fetch;
  window.fetch = async (input, requestInit) => {
    const response = await originalFetch(input, requestInit);
    if (response.status === 401 && isSameOrigin(response.url)) {
      void checkSession();
    }
    return response;
  };
};

function isSameOrigin(url: string): boolean {
  if (!url) return false;
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}
