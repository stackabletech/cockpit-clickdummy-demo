// THROWAWAY POC: anything the static demo cannot fake opens the contact modal.

export const demoGate = $state({ open: false });

export function openDemoGate(): void {
  demoGate.open = true;
}
