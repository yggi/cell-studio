<script lang="ts">
  // "A new version is ready": the service worker (vite-plugin-pwa, registerType 'prompt') waits until
  // the user accepts, so a playing piece is never cut off by a reload. Not registered in dev.
  import { registerSW } from 'virtual:pwa-register';

  let ready = $state(false);
  const update = registerSW({ onNeedRefresh: () => (ready = true) });
</script>

{#if ready}
  <div class="toast" role="status">
    <span>New version ready</span>
    <button onclick={() => update(true)}>Reload</button>
    <button class="quiet" onclick={() => (ready = false)} aria-label="Later">Later</button>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    z-index: 50;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom) + 12px);
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: 10px;
    color: var(--text);
    font-size: 14px;
  }
  button {
    background: var(--accent);
    color: var(--accent-ink);
    border: 0;
    border-radius: 6px;
    padding: 4px 10px;
    font: inherit;
    cursor: pointer;
  }
  button.quiet {
    background: none;
    color: var(--text-muted);
  }
</style>
