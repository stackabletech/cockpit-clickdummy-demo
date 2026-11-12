---
name: sync-upstream
description: Merge the latest stackabletech/cockpit main into this click dummy repo, review what upstream changed and adapt the static demo so everything still works without a backend and every write, download or outbound link opens the contact modal. Use when the user runs /sync-upstream or asks to update the click dummy from the cockpit.
---

# Sync the click dummy with upstream

This repository is a copy of [stackabletech/cockpit](https://github.com/stackabletech/cockpit)
plus a static demo, deployed to <https://stackabletech.github.io/cockpit-clickdummy-demo/> on every
push to `main`. Your job: merge upstream, then make every upstream change work in the demo.

Do not push and do not open PRs without asking. Commit in the user's name, conventional commits
(`type(scope): Capitalised subject`).

## How the demo works

`npm run build:demo` sets `VITE_COCKPIT_DEMO=true`, which makes `DEMO` (`src/lib/demo/flag.ts`) true.
Vite replaces it at build time, so `if (DEMO)` branches vanish from the normal production build.

- **Static build**: `svelte.config.js` switches to `adapter-static` (output `build-demo/`, base path
  from `COCKPIT_DEMO_BASE_PATH`) and lists the prerender `entries`. `src/routes/+layout.ts` prerenders
  everything with `ssr = false`. Server loads run once at build time and ship as `__data.json`.
- **Build-time user**: `handleDemoUser` (`src/lib/server/demo.ts`) replaces auth in `hooks.server.ts`.
  `init` in both hooks returns early in the demo.
- **Server loads**: every load that reads the database, S3, Trino or env has an `if (DEMO)` branch
  returning fixtures from `src/lib/demo/fixtures/`.
- **Form actions**: pages with actions cannot be prerendered, so they use
  `export const actions = (DEMO ? undefined : realActions) as Actions;`.
- **Browser API**: `src/lib/demo/install.ts` (loaded by `hooks.client.ts`) wraps `fetch`:
  - same-origin `GET /api/*` goes to the route table (`src/lib/demo/api/trino.ts`, `storage.ts`);
    an unknown GET logs `[demo] no fixture for …` and returns 404
  - any other method, and every form action, opens the contact modal (`openDemoGate()`)
- **Links**: a capture-phase click listener opens the modal for same-origin `/auth/*` and `/api/*`
  links, `download` links, and any host ending in `.demo.example`. Fixture URLs pointing "outside"
  (bookmarks, Trino Web UI, S3 endpoint) must use a `*.demo.example` host.
- **Modal**: `DemoContactModal.svelte`, mounted in `src/routes/+layout.svelte`.
- **i18n**: English only (`vite.config.ts` strategy `['baseLocale']`), but new message keys still go
  into both `messages/en.json` and `messages/de.json`.

`git grep -n "DEMO\b" -- src svelte.config.js vite.config.ts` lists every demo hook into app code.

## Steps

### 1. Merge

1. Require a clean working tree on `main`. Stop and ask if it isn't.
2. Add the remote if missing: `git remote add upstream git@github.com:stackabletech/cockpit.git`.
3. `git fetch upstream` and list what is new: `git log --oneline main..upstream/main`. Stop if empty.
4. `git merge upstream/main`. Known conflicts:
   - `.github/workflows/*` other than `demo-pages.yaml`, and `.github/dependabot.yml`: deleted here on
     purpose (they push images and charts to registries). Keep them deleted (`git rm`).
   - `README.md`: keep the click dummy note at the top, take upstream's text below it.
   - `src/hooks.server.ts`: keep `DEMO ? sequence(requestLogger, handleParaglide, handleDemoUser) : …`
     and take upstream's non-demo sequence unchanged.
   - Any file with a `DEMO` branch: keep the branch, take upstream's code in the non-demo path.

### 2. Review the upstream changes

Diff the merged upstream range (`git diff <merge-base>..upstream/main -- src messages svelte.config.js
vite.config.ts package.json`) and check each change against this list:

| Upstream change                                                                                   | What the demo needs                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New or changed `GET` API endpoint the UI calls                                                    | A handler in `src/lib/demo/api/*.ts` with fixture data, registered in the route table                                                                                                                        |
| New `POST`/`PUT`/`DELETE` endpoint or form action                                                 | Nothing if it goes through `fetch` or a form (gated automatically). Pages with actions need the `DEMO ? undefined : realActions` pattern                                                                     |
| New page or route                                                                                 | Add to `prerender.entries` in `svelte.config.js` if nothing links to it; dynamic routes need an `entries` generator returning the demo paths                                                                 |
| New or changed server load (`+layout.server.ts`, `+page.server.ts`) touching DB, S3, Trino or env | An `if (DEMO)` branch returning fixtures                                                                                                                                                                     |
| Changed response or data types (`src/lib/types/`, `src/lib/dashboard/types.ts`, …)                | Update the fixtures and fake handlers; `npm run check` finds most of it                                                                                                                                      |
| New outbound link (external tool, docs, Trino UI, download)                                       | Fixture URLs on a `*.demo.example` host, or an extra rule in `install.ts`                                                                                                                                    |
| New download, upload, delete, logout or other write                                               | Make sure it opens the modal: check it uses `fetch`, a form, an `/api` or `/auth` link, or a `download` link. Anything else (e.g. `window.open`, `location.href`, `navigator.sendBeacon`) needs its own gate |
| New required env variable read at build time                                                      | Add a dummy value to the `build:demo` script in `package.json`                                                                                                                                               |
| New feature visible on a demo page                                                                | Fixture data that shows it off, not an empty state                                                                                                                                                           |
| New client-side `fetch` to a path outside `/api/`                                                 | Route it through the demo, or the static host returns 404                                                                                                                                                    |

When unsure whether something needs adapting, build it and click through it (step 3) rather than
guessing. Ask the user before removing or hiding an upstream feature from the demo.

### 3. Verify

Run inside the dev shell if `node` is not on the PATH (`nix develop ~/dev/flake-dev-env -c …`).

1. `npm ci` if `package-lock.json` changed.
2. `npm run check` — 0 errors.
3. `npx eslint src/lib/demo src/lib/server/demo.ts src/lib/components/demo dev/serve-demo.mjs dev/demo-smoke.mjs`
   and `npx prettier --check` on the files you changed.
4. Build like the deployment does:
   `COCKPIT_DEMO_BASE_PATH=/cockpit-clickdummy-demo npm run build:demo`
5. Serve it on a free port (not 4180, the user's own; not 4173, the E2E tests):
   `PORT=4181 COCKPIT_DEMO_BASE_PATH=/cockpit-clickdummy-demo npm run serve:demo` in the background.
6. `npm run smoke:demo -- http://localhost:4181/cockpit-clickdummy-demo <screenshot-dir>` must end
   with `no console problems`. Extend `dev/demo-smoke.mjs` with a step for every new feature you
   adapted, including the contact modal for every new write.
7. Look at the screenshots, and open any new page in Playwright as well. Watch the server log and
   the console for `[demo] no fixture for` and 404s.
8. Stop the server you started.

### 4. Commit and report

1. Commit the merge, then the demo adaptations separately, e.g. `feat(demo): Fake the new … endpoint`.
2. Report to the user: the upstream commits merged, what you adapted and why, anything you left out
   or are unsure about, and the verification results. Ask before pushing to `main`, which deploys
   the public demo.
