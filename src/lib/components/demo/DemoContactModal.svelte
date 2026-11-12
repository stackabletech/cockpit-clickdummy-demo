<script lang="ts">
  // THROWAWAY POC: shown by the static demo whenever a visitor tries something
  // that needs a real backend.
  import IconMail from 'virtual:icons/material-symbols/mail-outline';
  import * as m from '$lib/paraglide/messages.js';
  import Modal from '$lib/components/Modal.svelte';
  import { demoGate } from '$lib/demo/gate.svelte';

  const CONTACT_URL = 'https://stackable.tech/en/contact/';

  const uid = $props.id();
</script>

<Modal bind:open={demoGate.open} aria-labelledby="{uid}-title" aria-describedby="{uid}-message">
  <div class="modal-box max-w-md">
    <h2 id="{uid}-title" class="text-lg font-bold">{m.demo_gate_title()}</h2>
    <p id="{uid}-message" class="text-muted py-4">{m.demo_gate_message()}</p>
    <div class="modal-action">
      <button type="button" class="btn btn-ghost" onclick={() => (demoGate.open = false)}>
        {m.demo_gate_close()}
      </button>
      <a href={CONTACT_URL} target="_top" rel="noopener" class="btn btn-primary">
        <IconMail class="size-5" aria-hidden="true" />
        {m.demo_gate_contact()}
      </a>
    </div>
  </div>
</Modal>
