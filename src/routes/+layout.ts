import { DEMO } from '$lib/demo/flag';

// THROWAWAY POC: the static demo prerenders every page as a client-rendered
// shell; server loads still run at build time and ship as `__data.json`.
export const prerender = DEMO;
export const ssr = !DEMO;
