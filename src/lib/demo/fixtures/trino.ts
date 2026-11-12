// THROWAWAY POC: Trino catalogue and example queries of the static demo. The
// table layout follows Trino's `tpch` connector; result values are made up.

import type { Column } from '$lib/types/query.js';

type ColumnSpec = [name: string, type: string];

const TPCH_TABLES: Record<string, ColumnSpec[]> = {
  customer: [
    ['custkey', 'bigint'],
    ['name', 'varchar(25)'],
    ['address', 'varchar(40)'],
    ['nationkey', 'bigint'],
    ['phone', 'varchar(15)'],
    ['acctbal', 'double'],
    ['mktsegment', 'varchar(10)'],
    ['comment', 'varchar(117)']
  ],
  lineitem: [
    ['orderkey', 'bigint'],
    ['partkey', 'bigint'],
    ['suppkey', 'bigint'],
    ['linenumber', 'integer'],
    ['quantity', 'double'],
    ['extendedprice', 'double'],
    ['discount', 'double'],
    ['tax', 'double'],
    ['returnflag', 'varchar(1)'],
    ['linestatus', 'varchar(1)'],
    ['shipdate', 'date'],
    ['commitdate', 'date'],
    ['receiptdate', 'date'],
    ['shipinstruct', 'varchar(25)'],
    ['shipmode', 'varchar(10)'],
    ['comment', 'varchar(44)']
  ],
  nation: [
    ['nationkey', 'bigint'],
    ['name', 'varchar(25)'],
    ['regionkey', 'bigint'],
    ['comment', 'varchar(152)']
  ],
  orders: [
    ['orderkey', 'bigint'],
    ['custkey', 'bigint'],
    ['orderstatus', 'varchar(1)'],
    ['totalprice', 'double'],
    ['orderdate', 'date'],
    ['orderpriority', 'varchar(15)'],
    ['clerk', 'varchar(15)'],
    ['shippriority', 'integer'],
    ['comment', 'varchar(79)']
  ],
  part: [
    ['partkey', 'bigint'],
    ['name', 'varchar(55)'],
    ['mfgr', 'varchar(25)'],
    ['brand', 'varchar(10)'],
    ['type', 'varchar(25)'],
    ['size', 'integer'],
    ['container', 'varchar(10)'],
    ['retailprice', 'double'],
    ['comment', 'varchar(23)']
  ],
  partsupp: [
    ['partkey', 'bigint'],
    ['suppkey', 'bigint'],
    ['availqty', 'integer'],
    ['supplycost', 'double'],
    ['comment', 'varchar(199)']
  ],
  region: [
    ['regionkey', 'bigint'],
    ['name', 'varchar(25)'],
    ['comment', 'varchar(152)']
  ],
  supplier: [
    ['suppkey', 'bigint'],
    ['name', 'varchar(25)'],
    ['address', 'varchar(40)'],
    ['nationkey', 'bigint'],
    ['phone', 'varchar(15)'],
    ['acctbal', 'double'],
    ['comment', 'varchar(101)']
  ]
};

/** catalog → schema → table → columns */
export const demoCatalogs: Record<string, Record<string, Record<string, ColumnSpec[]>>> = {
  tpch: { tiny: TPCH_TABLES, sf1: TPCH_TABLES, sf100: TPCH_TABLES }
};

export const demoFunctions = [
  'abs',
  'approx_distinct',
  'array_agg',
  'avg',
  'cardinality',
  'cast',
  'ceil',
  'coalesce',
  'concat',
  'count',
  'current_date',
  'current_timestamp',
  'date_add',
  'date_diff',
  'date_format',
  'date_trunc',
  'day',
  'floor',
  'format',
  'from_iso8601_timestamp',
  'greatest',
  'json_extract',
  'json_extract_scalar',
  'least',
  'length',
  'lower',
  'max',
  'min',
  'month',
  'now',
  'nullif',
  'regexp_like',
  'replace',
  'round',
  'split',
  'stddev',
  'substr',
  'sum',
  'trim',
  'try_cast',
  'upper',
  'year'
];

const NATIONS: [number, string, number][] = [
  [0, 'ALGERIA', 0],
  [1, 'ARGENTINA', 1],
  [2, 'BRAZIL', 1],
  [3, 'CANADA', 1],
  [4, 'EGYPT', 4],
  [5, 'ETHIOPIA', 0],
  [6, 'FRANCE', 3],
  [7, 'GERMANY', 3],
  [8, 'INDIA', 2],
  [9, 'INDONESIA', 2],
  [10, 'IRAN', 4],
  [11, 'IRAQ', 4],
  [12, 'JAPAN', 2],
  [13, 'JORDAN', 4],
  [14, 'KENYA', 0],
  [15, 'MOROCCO', 0],
  [16, 'MOZAMBIQUE', 0],
  [17, 'PERU', 1],
  [18, 'CHINA', 2],
  [19, 'ROMANIA', 3],
  [20, 'SAUDI ARABIA', 4],
  [21, 'VIETNAM', 2],
  [22, 'RUSSIA', 3],
  [23, 'UNITED KINGDOM', 3],
  [24, 'UNITED STATES', 1]
];

export interface DemoQuery {
  sql: string;
  columns: Column[];
  rows: unknown[][];
  /** Simulated run time. */
  durationMs: number;
}

const queries = (): DemoQuery[] => [
  {
    sql: 'SELECT 1',
    columns: [{ name: '_col0', type: 'integer' }],
    rows: [[1]],
    durationMs: 400
  },
  {
    sql: `SELECT nationkey, name, regionkey
FROM tpch.tiny.nation
ORDER BY name`,
    columns: [
      { name: 'nationkey', type: 'bigint' },
      { name: 'name', type: 'varchar(25)' },
      { name: 'regionkey', type: 'bigint' }
    ],
    rows: [...NATIONS].sort((a, b) => a[1].localeCompare(b[1])),
    durationMs: 1200
  },
  {
    sql: `SELECT r.name AS region,
       count(*) AS customers,
       round(avg(c.acctbal), 2) AS avg_balance
FROM tpch.tiny.customer c
JOIN tpch.tiny.nation n ON c.nationkey = n.nationkey
JOIN tpch.tiny.region r ON n.regionkey = r.regionkey
GROUP BY r.name
ORDER BY customers DESC`,
    columns: [
      { name: 'region', type: 'varchar(25)' },
      { name: 'customers', type: 'bigint' },
      { name: 'avg_balance', type: 'double' }
    ],
    rows: [
      ['AMERICA', 315, 4612.37],
      ['EUROPE', 303, 4398.05],
      ['ASIA', 301, 4521.88],
      ['AFRICA', 298, 4475.12],
      ['MIDDLE EAST', 283, 4430.61]
    ],
    durationMs: 2500
  },
  {
    sql: `SELECT year(orderdate) AS year,
       count(*) AS orders,
       round(sum(totalprice) / 1e6, 2) AS revenue_millions
FROM tpch.tiny.orders
GROUP BY year(orderdate)
ORDER BY year`,
    columns: [
      { name: 'year', type: 'bigint' },
      { name: 'orders', type: 'bigint' },
      { name: 'revenue_millions', type: 'double' }
    ],
    rows: [
      [1992, 2290, 345.82],
      [1993, 2240, 338.27],
      [1994, 2225, 336.11],
      [1995, 2280, 344.36],
      [1996, 2265, 341.9],
      [1997, 2250, 339.74],
      [1998, 1450, 218.95]
    ],
    durationMs: 3000
  }
];

/**
 * Initial content of every editor tab: the queries a visitor can run. A
 * function, so the normal build can drop this module entirely.
 */
export function demoSql(): string {
  const examples = queries()
    .slice(1)
    .map((q) => `${q.sql};`)
    .join('\n\n');
  return `-- Welcome to the Stackable Cockpit demo.
-- Run all statements, or put the cursor into one and run only that.

${examples}
`;
}

/** Compare SQL ignoring comments, case, whitespace and a trailing semicolon. */
function normalise(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/;\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function findDemoQuery(sql: string): DemoQuery | undefined {
  const normalised = normalise(sql);
  return queries().find((q) => normalise(q.sql) === normalised);
}
