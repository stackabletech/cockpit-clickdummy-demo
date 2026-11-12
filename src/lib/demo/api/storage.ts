// THROWAWAY POC: fake read-only `/api/storage/*` for the static demo. Writes
// are not routed here, so they open the contact modal.

import type { StoragePage, StorageObject } from '$lib/storage/types.js';
import type { BucketDetails, DirectoryMetadata, FileDetails } from '$lib/storage/details-types.js';
import { demoBuckets, demoDirectories } from '../fixtures/storage.js';
import { demoParquet, type DemoParquet } from '../fixtures/parquet.js';
import { demoError, json, type DemoRequest } from './response.js';

const EPOCH = '1970-01-01T00:00:00.000Z';

function bucketOf(req: DemoRequest) {
  const name = req.url.searchParams.get('bucket') ?? '';
  return { name, objects: demoBuckets[name] };
}

function buckets(req: DemoRequest): Response {
  if (req.url.searchParams.get('details') !== 'true') return json(Object.keys(demoBuckets).sort());
  const { name, objects } = bucketOf(req);
  if (!objects) return demoError(404);
  const details: BucketDetails = {
    name,
    versioning: 'Enabled',
    lifecycleRules: null,
    tags: { team: 'data-platform', environment: 'demo' },
    acl: null
  };
  return json(details);
}

function list(req: DemoRequest): Response {
  const { objects } = bucketOf(req);
  if (!objects) return demoError(404);
  const prefix = req.url.searchParams.get('prefix') ?? '';
  const pageSize = Number(req.url.searchParams.get('pageSize') ?? 25) || 25;

  const dirs = new Set<string>();
  const files: StorageObject[] = [];
  for (const [key, file] of Object.entries(objects)) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const slash = rest.indexOf('/');
    if (slash === -1) {
      files.push({
        key,
        size: file.size,
        lastModified: file.lastModified as unknown as Date,
        isDirectory: false,
        contentType: undefined
      });
    } else {
      dirs.add(prefix + rest.slice(0, slash + 1));
    }
  }
  const all: StorageObject[] = [
    ...[...dirs].sort().map((key) => ({
      key,
      size: 0,
      lastModified: EPOCH as unknown as Date,
      isDirectory: true,
      contentType: undefined
    })),
    ...files.sort((a, b) => a.key.localeCompare(b.key))
  ];
  const page: StoragePage = {
    objects: all.slice(0, pageSize),
    hasNextPage: false,
    currentPage: 1,
    pageSize,
    continuationToken: null,
    nextContinuationToken: null
  };
  return json(page);
}

function details(req: DemoRequest): Response {
  const { objects } = bucketOf(req);
  const key = req.url.searchParams.get('key') ?? '';
  const file = objects?.[key];
  if (!file) return demoError(404);
  const result: FileDetails = {
    key,
    name: key.split('/').at(-1) ?? key,
    size: file.size,
    lastModified: file.lastModified,
    contentType: file.contentType,
    etag: `"demo-${file.size.toString(16)}"`,
    storageClass: 'STANDARD',
    isDeleteMarker: false
  } as unknown as FileDetails;
  return json(result);
}

function directoryMetadata(req: DemoRequest): Response {
  const { objects, name } = bucketOf(req);
  if (!objects || !demoDirectories(name).includes(req.url.searchParams.get('prefix') ?? '')) {
    return demoError(404);
  }
  const metadata: DirectoryMetadata = {
    bucketOwner: 'demo',
    bucketGrants: null,
    markerExists: false
  } as DirectoryMetadata;
  return json(metadata);
}

function csvNdjson(content: string, req: DemoRequest): Response {
  const [header, ...rows] = content.split('\n').map((line) => line.split(','));
  const offset = Number(req.url.searchParams.get('offset') ?? 0);
  const limit = Number(req.url.searchParams.get('limit') ?? 250);
  const lines: unknown[] = [{ t: 'h', h: header, tr: rows.length }];
  if (req.url.searchParams.get('data') === 'true') {
    lines.push({ t: 'r', v: rows.slice(offset, offset + limit) });
  }
  lines.push({ t: 'd' });
  return new Response(lines.map((line) => JSON.stringify(line)).join('\n') + '\n', {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'X-Preview-Format': 'csv',
      'X-Preview-Total-Rows': String(rows.length),
      'X-Preview-Offset': String(offset),
      'X-Preview-Total-Size': String(content.length),
      'X-Preview-Truncated': 'false'
    }
  });
}

/** Schema, statistics and, with `data=true`, a page of rows, like the server's Parquet preview. */
function parquetNdjson(parquet: DemoParquet, size: number, req: DemoRequest): Response {
  const offset = Number(req.url.searchParams.get('offset') ?? 0);
  const limit = Number(req.url.searchParams.get('limit') ?? 250);
  const columnSize = Math.round(size / parquet.columns.length);
  const header = {
    t: 'h',
    h: parquet.columns.map((c) => c.name),
    tr: parquet.totalRows,
    s: parquet.columns.map((c) => ({
      name: c.name,
      type: c.type,
      codec: 'ZSTD',
      compressedSize: columnSize,
      uncompressedSize: columnSize * 3,
      stats: { nullCount: 0, distinctCount: null, min: c.min, max: c.max }
    })),
    m: {
      rowGroups: 1,
      compressionCodecs: ['ZSTD'],
      compressionUniform: true,
      hasOffsetIndex: true,
      hasColumnIndex: true,
      createdBy: 'Trino',
      version: 2,
      arrowSchema: null
    }
  };
  const lines: unknown[] = [header];
  const includeData = req.url.searchParams.get('data') === 'true';
  const end = includeData ? Math.min(parquet.totalRows, offset + limit) : offset;
  if (includeData) {
    const rows = Array.from({ length: end - offset }, (_, i) => parquet.row(offset + i));
    parquet.columns.forEach((c, col) =>
      lines.push({ t: 'c', n: c.name, v: rows.map((r) => r[col]) })
    );
  }
  lines.push({ t: 'd' });
  return new Response(lines.map((line) => JSON.stringify(line)).join('\n') + '\n', {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'X-Preview-Format': 'parquet',
      'X-Preview-Renderable': 'true',
      'X-Preview-Data-Blocked': 'false',
      'X-Preview-Truncated': String(end < parquet.totalRows),
      'X-Preview-Total-Size': String(size),
      'X-Preview-Total-Rows': String(parquet.totalRows),
      'X-Preview-Offset': String(offset)
    }
  });
}

/** The first bytes of a binary file: not valid UTF-8, so the preview shows its binary fallback. */
const BINARY_BYTES = new Uint8Array([0x80, 0x81, 0x82, 0x83, 0xff, 0xfe, 0xfd, 0xfc]);

function preview(req: DemoRequest): Response {
  const { objects } = bucketOf(req);
  const key = req.url.searchParams.get('key') ?? '';
  const file = objects?.[key];
  if (!file) return demoError(404);
  const parquet = key.endsWith('.parquet') ? demoParquet(key) : null;
  if (parquet) return parquetNdjson(parquet, file.size, req);
  if (file.content === undefined) {
    return new Response(BINARY_BYTES, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Preview-Total-Size': String(file.size),
        'X-Preview-Bytes': String(BINARY_BYTES.length),
        'X-Preview-Truncated': 'true'
      }
    });
  }
  if (file.contentType === 'text/csv') return csvNdjson(file.content, req);
  const lines = file.content.split('\n');
  return new Response(file.content, {
    headers: {
      'Content-Type': file.contentType ?? 'text/plain',
      'X-Preview-Renderable': 'true',
      'X-Preview-Truncated': 'false',
      'X-Preview-Total-Size': String(file.size),
      'X-Preview-Bytes': String(file.size),
      'X-Preview-Preview-Rows': String(lines.length),
      'X-Preview-Preview-Columns': String(Math.max(...lines.map((l) => l.length)))
    }
  });
}

export const storageRoutes: Record<string, (req: DemoRequest) => Response> = {
  '/api/storage/buckets': buckets,
  '/api/storage/list': list,
  '/api/storage/details': details,
  '/api/storage/directory-metadata': directoryMetadata,
  '/api/storage/preview': preview,
  '/api/storage/search/history': () => json([]),
  '/api/storage/download/manifests': () => json([])
};
