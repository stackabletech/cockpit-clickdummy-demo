<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { theme } from '$lib/theme.svelte';
  import NavigationProgress from '$lib/components/layout/NavigationProgress.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { DEMO } from '$lib/demo/flag';

  let { children } = $props();

  // THROWAWAY POC: only the static demo build loads the contact modal.
  const demoModal = DEMO ? import('$lib/components/demo/DemoContactModal.svelte') : null;

  onMount(() => {
    document.body.classList.add('hydrated');

    const observer = new MutationObserver(() => {
      theme.current = document.documentElement.dataset.theme ?? 'dark';
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => observer.disconnect();
  });
</script>

<NavigationProgress />
<svelte:head>
  <meta name="description" content={m.meta_description()} />
</svelte:head>

{@render children()}

{#if demoModal}
  {#await demoModal then { default: DemoContactModal }}
    <DemoContactModal />
  {/await}
{/if}
