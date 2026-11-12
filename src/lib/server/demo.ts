// THROWAWAY POC: the always signed-in user of the static website demo. Only
// used while prerendering `npm run build:demo`.

import type { Handle } from '@sveltejs/kit';
import { DEMO_CONNECTION_ID } from '$lib/demo/fixtures/storage.js';

const created = new Date('2026-01-01T00:00:00Z');

const demoUser: NonNullable<App.Locals['user']> = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@example.com',
  emailVerified: true,
  image: null,
  createdAt: created,
  updatedAt: created,
  trinoUser: 'demo'
};

const demoSession: NonNullable<App.Locals['session']> = {
  id: 'demo-session',
  userId: demoUser.id,
  token: 'demo',
  expiresAt: new Date('2099-01-01T00:00:00Z'),
  createdAt: created,
  updatedAt: created,
  ipAddress: null,
  userAgent: null,
  activeStorageConnectionId: DEMO_CONNECTION_ID
};

export const handleDemoUser: Handle = ({ event, resolve }) => {
  event.locals.user = demoUser;
  event.locals.session = demoSession;
  return resolve(event);
};
