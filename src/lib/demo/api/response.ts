// THROWAWAY POC: helpers shared by the fake API handlers.

import * as m from '$lib/paraglide/messages.js';

export interface DemoRequest {
  url: URL;
  method: string;
  headers: Headers;
  json: () => Promise<unknown>;
}

export function json(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, init);
}

/** An `App.Error` body like SvelteKit's `error()`, so the UI shows the message. */
export function demoError(status: number): Response {
  return json({ message: m.demo_not_available() }, { status });
}
