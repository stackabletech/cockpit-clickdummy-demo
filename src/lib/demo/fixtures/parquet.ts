// THROWAWAY POC: contents of the demo's Parquet files, generated row by row so
// the preview can scroll through all of them without shipping the data.

interface ParquetColumn {
  name: string;
  type: string;
  min: string;
  max: string;
}

export interface DemoParquet {
  columns: ParquetColumn[];
  totalRows: number;
  row: (index: number) => unknown[];
}

/** Deterministic pseudo-random number in [0, 1) for a row and column. */
function noise(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const SEGMENTS = ['AUTOMOBILE', 'BUILDING', 'FURNITURE', 'HOUSEHOLD', 'MACHINERY'];
const PRIORITIES = ['1-URGENT', '2-HIGH', '3-MEDIUM', '4-NOT SPECIFIED', '5-LOW'];
const STATUSES = ['F', 'O', 'P'];

function pick<T>(values: readonly T[], index: number, salt: number): T {
  return values[Math.floor(noise(index, salt) * values.length)];
}

const customers: DemoParquet = {
  totalRows: 1500,
  columns: [
    { name: 'custkey', type: 'int64', min: '1', max: '1500' },
    { name: 'name', type: 'string', min: 'Customer#000000001', max: 'Customer#000001500' },
    { name: 'nationkey', type: 'int64', min: '0', max: '24' },
    { name: 'mktsegment', type: 'string', min: 'AUTOMOBILE', max: 'MACHINERY' },
    { name: 'acctbal', type: 'decimal(12,2)', min: '-999.95', max: '9999.72' }
  ],
  row: (i) => [
    i + 1,
    `Customer#${String(i + 1).padStart(9, '0')}`,
    // The 25 TPC-H nations.
    Math.floor(noise(i, 1) * 25),
    pick(SEGMENTS, i, 2),
    Math.round((noise(i, 3) * 11000 - 1000) * 100) / 100
  ]
};

function orders(day: string, firstKey: number): DemoParquet {
  return {
    totalRows: 612,
    columns: [
      { name: 'orderkey', type: 'int64', min: String(firstKey), max: String(firstKey + 611) },
      { name: 'custkey', type: 'int64', min: '1', max: '1499' },
      { name: 'orderstatus', type: 'string', min: 'F', max: 'P' },
      { name: 'totalprice', type: 'decimal(12,2)', min: '1032.40', max: '498112.87' },
      { name: 'orderdate', type: 'date', min: day, max: day },
      { name: 'orderpriority', type: 'string', min: '1-URGENT', max: '5-LOW' }
    ],
    row: (i) => [
      firstKey + i,
      1 + Math.floor(noise(firstKey + i, 1) * 1499),
      pick(STATUSES, firstKey + i, 2),
      Math.round((1000 + noise(firstKey + i, 3) * 497000) * 100) / 100,
      day,
      pick(PRIORITIES, firstKey + i, 4)
    ]
  };
}

/** The demo's Parquet file at `key`, or null if it has no generated contents. */
export function demoParquet(key: string): DemoParquet | null {
  if (key.startsWith('warehouse/customers/')) return customers;
  const day = /orderdate=(\d{4}-\d{2}-\d{2})\//.exec(key)?.[1];
  if (key.startsWith('warehouse/orders/') && day) {
    return orders(day, 1 + (Number(day.slice(-2)) - 1) * 612);
  }
  return null;
}
