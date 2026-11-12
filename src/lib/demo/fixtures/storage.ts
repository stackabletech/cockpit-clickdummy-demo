// THROWAWAY POC: the object store of the static demo. `.example` hosts never
// resolve; all files and their contents are made up.

import type { ConnectionListItem } from '$lib/storage/connection-store.svelte.js';

export const DEMO_CONNECTION_ID = '00000000-0000-4000-8000-000000000001';

export const demoConnections: ConnectionListItem[] = [
  {
    id: DEMO_CONNECTION_ID,
    name: 'Demo object store',
    endpoint: 's3.demo.example:9000',
    additionalBuckets: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

/** Hostname of the demo endpoint: the `[connection]` segment of browse URLs. */
export const DEMO_CONNECTION_HOST = 's3.demo.example';

export interface DemoFile {
  size: number;
  lastModified: string;
  contentType?: string;
  /** Text content; files without it have no preview. */
  content?: string;
}

const ORDERS_CSV = [
  'orderkey,custkey,orderstatus,totalprice,orderdate,orderpriority',
  '1,370,O,172799.49,1996-01-02,5-LOW',
  '2,781,O,38426.09,1996-12-01,1-URGENT',
  '3,1234,F,205654.30,1993-10-14,5-LOW',
  '4,1369,O,56000.91,1995-10-11,5-LOW',
  '5,445,F,105367.67,1994-07-30,5-LOW',
  '6,557,F,45523.10,1992-02-21,4-NOT SPECIFIED',
  '7,392,O,271885.66,1996-01-10,2-HIGH',
  '32,1301,O,198665.57,1995-07-16,2-HIGH',
  '33,670,F,146567.24,1993-10-27,3-MEDIUM',
  '34,611,O,73315.48,1998-07-21,3-MEDIUM'
].join('\n');

const PIPELINE_JSON = JSON.stringify(
  {
    name: 'daily-orders',
    schedule: '0 2 * * *',
    source: 's3a://raw-data/orders/',
    target: 'iceberg.lakehouse.orders',
    format: 'parquet',
    partitionBy: ['orderdate']
  },
  null,
  2
);

const README = `# Lakehouse

Curated tables of the demo data platform, written by Apache Spark jobs and
queried with Trino.

- \`warehouse/orders/\`: Apache Iceberg table, partitioned by order date
- \`exports/\`: CSV extracts for the finance team
`;

function file(content: string, contentType: string, lastModified: string): DemoFile {
  return { size: new TextEncoder().encode(content).length, content, contentType, lastModified };
}

function blob(size: number, lastModified: string, contentType?: string): DemoFile {
  return { size, lastModified, contentType };
}

/** bucket → object key → file. Directories are implied by the keys. */
export const demoBuckets: Record<string, Record<string, DemoFile>> = {
  lakehouse: {
    'README.md': file(README, 'text/markdown', '2026-03-02T09:15:00.000Z'),
    'exports/orders-2026-03.csv': file(ORDERS_CSV, 'text/csv', '2026-04-01T02:10:00.000Z'),
    'exports/orders-2026-04.csv': file(ORDERS_CSV, 'text/csv', '2026-05-01T02:10:00.000Z'),
    'warehouse/orders/metadata/v1.metadata.json': file(
      JSON.stringify(
        { 'format-version': 2, 'table-uuid': 'demo', location: 's3://lakehouse/warehouse/orders' },
        null,
        2
      ),
      'application/json',
      '2026-03-01T10:00:00.000Z'
    ),
    'warehouse/orders/data/orderdate=2026-04-01/00000-0-data.parquet': blob(
      18_432_112,
      '2026-04-01T02:05:00.000Z'
    ),
    'warehouse/orders/data/orderdate=2026-04-02/00000-0-data.parquet': blob(
      17_986_540,
      '2026-04-02T02:05:00.000Z'
    ),
    'warehouse/orders/data/orderdate=2026-04-03/00000-0-data.parquet': blob(
      19_204_887,
      '2026-04-03T02:05:00.000Z'
    ),
    'warehouse/customers/data/00000-0-data.parquet': blob(4_812_003, '2026-02-14T11:00:00.000Z')
  },
  'raw-data': {
    'orders/2026-04-01.csv': file(ORDERS_CSV, 'text/csv', '2026-04-01T00:30:00.000Z'),
    'orders/2026-04-02.csv': file(ORDERS_CSV, 'text/csv', '2026-04-02T00:30:00.000Z'),
    'clickstream/2026/04/01/events-0001.json.gz': blob(
      52_118_330,
      '2026-04-01T23:59:00.000Z',
      'application/gzip'
    ),
    'pipelines/daily-orders.json': file(
      PIPELINE_JSON,
      'application/json',
      '2026-01-20T08:00:00.000Z'
    )
  },
  'ml-models': {
    'churn/v3/model.onnx': blob(88_412_221, '2026-03-28T16:40:00.000Z'),
    'churn/v3/metrics.json': file(
      JSON.stringify({ auc: 0.912, precision: 0.84, recall: 0.79 }, null, 2),
      'application/json',
      '2026-03-28T16:41:00.000Z'
    )
  }
};

/** Every directory prefix of a bucket, `''` for its root, each ending in `/`. */
export function demoDirectories(bucket: string): string[] {
  const dirs = new Set<string>(['']);
  for (const key of Object.keys(demoBuckets[bucket] ?? {})) {
    const parts = key.split('/').slice(0, -1);
    for (let i = 1; i <= parts.length; i++) dirs.add(parts.slice(0, i).join('/') + '/');
  }
  return [...dirs];
}
