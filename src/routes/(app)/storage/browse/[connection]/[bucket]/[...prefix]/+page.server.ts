import { redirect } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';
import { DEMO } from '$lib/demo/flag';
import { DEMO_CONNECTION_HOST, demoBuckets, demoDirectories } from '$lib/demo/fixtures/storage';

// THROWAWAY POC: the static demo prerenders every directory of its buckets.
export const entries: EntryGenerator = () =>
  DEMO
    ? Object.keys(demoBuckets).flatMap((bucket) =>
        demoDirectories(bucket).map((dir) => ({
          connection: DEMO_CONNECTION_HOST,
          bucket,
          prefix: dir.replace(/\/$/, '')
        }))
      )
    : [];

export const load: PageServerLoad = async ({ params, locals }) => {
  const activeId = locals.session?.activeStorageConnectionId ?? null;
  if (!activeId) {
    throw redirect(303, '/storage');
  }
  const prefix = params.prefix ? params.prefix + '/' : '';
  const bucket = params.bucket;
  const connection = params.connection;
  return { connection, bucket, prefix, activeConnectionId: activeId };
};
