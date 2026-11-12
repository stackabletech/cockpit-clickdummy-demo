// THROWAWAY POC: demo bookmarks. `.example` hosts never resolve.

import type { Bookmark, BookmarkLink } from '$lib/dashboard/types';

export const demoGlobalBookmarks: BookmarkLink[] = [
  {
    id: 'global-0',
    productId: 'superset',
    name: 'Apache Superset',
    environment: 'Production',
    url: 'https://superset.demo.example/',
    pinned: false
  },
  {
    id: 'global-1',
    productId: 'airflow',
    name: 'Apache Airflow',
    environment: 'Production',
    url: 'https://airflow.demo.example/',
    pinned: false
  },
  {
    id: 'global-2',
    productId: 'nifi',
    name: 'Apache NiFi',
    environment: 'Production',
    url: 'https://nifi.demo.example/',
    pinned: false
  }
];

export const demoBookmarks: Bookmark[] = [
  {
    id: 'demo-bookmark-0',
    productId: 'trino',
    name: 'Trino Web UI',
    environment: 'Staging',
    url: 'https://trino.demo.example/ui/',
    pinned: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'demo-bookmark-1',
    productId: 'opensearch',
    name: 'OpenSearch Dashboards',
    environment: 'Staging',
    url: 'https://opensearch.demo.example/',
    pinned: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];
