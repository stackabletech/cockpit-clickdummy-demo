// THROWAWAY POC: static website demo. Replaced at build time by Vite, so the
// normal build drops every `if (DEMO)` branch and the demo modules with it.
export const DEMO = import.meta.env.VITE_COCKPIT_DEMO === 'true';
