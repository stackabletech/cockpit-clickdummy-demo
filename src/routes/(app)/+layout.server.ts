import type { LayoutServerLoad } from './$types';
import { storageBrowserEnabled } from '$lib/server/feature-flags.js';
import { listBookmarks } from '$lib/server/dashboard/bookmarks-db.js';
import { globalBookmarks } from '$lib/server/dashboard/config.js';
import { dashboardBookmarksTotal } from '$lib/server/metrics.js';
import { BOOKMARKS_DEPENDENCY, type Bookmark } from '$lib/dashboard/types';
import { DEMO } from '$lib/demo/flag';
import { demoBookmarks, demoGlobalBookmarks } from '$lib/demo/fixtures/bookmarks';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
  depends(BOOKMARKS_DEPENDENCY);
  // THROWAWAY POC: fixed bookmarks in the static demo.
  if (DEMO) {
    return {
      user: locals.user,
      storageBrowserEnabled,
      globalBookmarks: demoGlobalBookmarks,
      bookmarks: demoBookmarks,
      bookmarksFailed: false
    };
  }
  return {
    user: locals.user,
    storageBrowserEnabled,
    globalBookmarks,
    ...(await loadBookmarks(locals))
  };
};

/**
 * The signed-in user's bookmarks, or null when they are unavailable: without
 * OIDC there is no user to store them for, and a database failure must not
 * take down every page of the app; `bookmarksFailed` tells the two apart.
 */
async function loadBookmarks(
  locals: App.Locals
): Promise<{ bookmarks: Bookmark[] | null; bookmarksFailed: boolean }> {
  if (!locals.user) return { bookmarks: null, bookmarksFailed: false };
  try {
    const bookmarks = await listBookmarks(locals.user.id);
    dashboardBookmarksTotal.inc({ operation: 'load', outcome: 'success' });
    return { bookmarks, bookmarksFailed: false };
  } catch (err) {
    dashboardBookmarksTotal.inc({ operation: 'load', outcome: 'error' });
    locals.logger.error({ err, user_id: locals.user.id }, 'Failed to load bookmarks');
    return { bookmarks: null, bookmarksFailed: true };
  }
}
