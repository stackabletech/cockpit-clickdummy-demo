// THROWAWAY POC: fake `/api/trino/*` for the static demo. Queries run in
// memory; only the example queries in `DEMO_SQL` are known.

import type { QuerySnapshot, QueryState } from '$lib/types/query.js';
import { demoCatalogs, demoFunctions, findDemoQuery, type DemoQuery } from '../fixtures/trino.js';
import { openDemoGate } from '../gate.svelte.js';
import { demoError, json, type DemoRequest } from './response.js';

interface RunningStatement {
  query: DemoQuery;
  sql: string;
  startedAt: number;
  cancelled: boolean;
  queryId: string;
}

// Shaped like Trino's query IDs. The `*.demo.example` host makes the "View in
// Trino" link open the contact modal (see install.ts).
let queryCounter = 0;
function nextQueryId(startedAt: number): string {
  const time = new Date(startedAt).toISOString().replace(/[-:T]/g, '').slice(0, 14);
  queryCounter += 1;
  return `${time.slice(0, 8)}_${time.slice(8)}_${String(queryCounter).padStart(5, '0')}_demo0`;
}

// Plain Map: module state, not reactive.
const tabs = new Map<string, RunningStatement[]>();

function snapshot(stmt: RunningStatement, now: number, lightweight: boolean): QuerySnapshot {
  const elapsed = Math.max(0, now - stmt.startedAt);
  const { durationMs, columns, rows } = stmt.query;
  let state: QueryState;
  if (stmt.cancelled) state = 'CANCELLED';
  else if (elapsed < 150) state = 'QUEUED';
  else if (elapsed < 400) state = 'PLANNING';
  else if (elapsed < durationMs) state = 'RUNNING';
  else state = 'FINISHED';

  const finished = state === 'FINISHED';
  const withRows = finished && !lightweight;
  return {
    trinoQueryUrl: `https://trino.demo.example/ui/#/queries/${stmt.queryId}`,
    state,
    progress: {
      progressPercentage: finished ? 100 : Math.min(99, (elapsed / durationMs) * 100),
      elapsedTimeMillis: Math.min(elapsed, durationMs)
    },
    columns: withRows ? columns : [],
    rows: withRows ? rows : [],
    rowCount: finished ? rows.length : 0,
    error: null,
    rowLimitReached: false,
    sql: stmt.sql,
    startedAt: stmt.startedAt
  };
}

async function query(req: DemoRequest): Promise<Response> {
  const tabId = req.url.searchParams.get('tabId') ?? '';
  if (req.method === 'POST') {
    const body = (await req.json()) as { statements: string[]; tabId: string };
    const queries = body.statements.map((sql) => ({ sql, query: findDemoQuery(sql) }));
    if (queries.some((q) => !q.query)) {
      openDemoGate();
      return demoError(403);
    }
    // Statements of a script run one after another.
    let start = Date.now();
    tabs.set(
      body.tabId,
      queries.map(({ sql, query }) => {
        const stmt = {
          sql,
          query: query!,
          startedAt: start,
          cancelled: false,
          queryId: nextQueryId(start)
        };
        start += query!.durationMs;
        return stmt;
      })
    );
    return json({ ok: true });
  }
  if (req.method === 'DELETE') {
    if (req.url.searchParams.get('cleanup') === 'true') tabs.delete(tabId);
    else for (const stmt of tabs.get(tabId) ?? []) stmt.cancelled = true;
    return json({ ok: true });
  }
  const now = Date.now();
  const lightweight = req.url.searchParams.get('lightweight') !== 'false';
  const snapshots = (tabs.get(tabId) ?? [])
    .filter((stmt) => stmt.startedAt <= now)
    .map((stmt) => snapshot(stmt, now, lightweight));
  return json(snapshots);
}

function schemasOf(catalog: string | null) {
  return Object.keys(demoCatalogs[catalog ?? ''] ?? {});
}

function tablesOf(catalog: string | null, schema: string | null) {
  return Object.keys(demoCatalogs[catalog ?? '']?.[schema ?? ''] ?? {});
}

function columnsOf(catalog: string | null, schema: string | null, table: string | null) {
  return demoCatalogs[catalog ?? '']?.[schema ?? '']?.[table ?? ''] ?? [];
}

function catalog(req: DemoRequest): Response {
  const p = req.url.searchParams;
  const [cat, schema, table] = [p.get('catalog'), p.get('schema'), p.get('table')];
  switch (p.get('level')) {
    case 'catalogs':
      return json(Object.keys(demoCatalogs).map((name) => [name]));
    case 'schemas':
      return json(schemasOf(cat).map((name) => [name]));
    case 'tables':
      return json(tablesOf(cat, schema).map((name) => [name, 'BASE TABLE']));
    case 'columns':
      return json(columnsOf(cat, schema, table).map(([name, type]) => [name, type, '', '']));
    default:
      return demoError(400);
  }
}

function completion(req: DemoRequest): Response {
  const p = req.url.searchParams;
  const [cat, schema, table] = [p.get('catalog'), p.get('schema'), p.get('table')];
  switch (p.get('level')) {
    case 'catalogs':
      return json(Object.keys(demoCatalogs));
    case 'schemas':
      return json(schemasOf(cat));
    case 'tables':
      // Without a schema the real endpoint lists every schema's tables.
      return json(
        (schema ? [schema] : schemasOf(cat))
          .flatMap((s) => tablesOf(cat, s))
          .filter((name, i, all) => all.indexOf(name) === i)
          .map((name) => ({ name, kind: 'table' }))
      );
    case 'columns':
      return json(columnsOf(cat, schema, table).map(([name]) => name));
    case 'functions':
      return json(demoFunctions);
    default:
      return demoError(400);
  }
}

export const trinoRoutes: Record<string, (req: DemoRequest) => Response | Promise<Response>> = {
  '/api/trino/query': query,
  '/api/trino/catalog': catalog,
  '/api/trino/completion/metadata': completion
};
