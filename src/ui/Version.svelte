<script lang="ts">
  /**
   * The build, small, under the app's name: its commit's first 7 characters (`dev` for a build that doesn't know
   * its commit). A tap opens a sheet (kit/Sheet.svelte) with the rest: the commit in full, the branch, the build
   * date, the dependencies it ships, and whether a new version waits. Releases aren't meaningful yet, so the hash
   * is what stands for a build. yggi/jambot has the same component (apps/web/src/components/Version.svelte), lifted.
   * Given children, they are what's tapped (the header's wordmark), the hash in its title.
   */
  import type { Snippet } from 'svelte';
  import { builtOn, shortVersion } from '../buildInfo';
  import Sheet from './kit/Sheet.svelte';
  import { update } from './state/update.svelte';

  let { children }: { children?: Snippet } = $props();

  const build = __BUILD__;
  let open = $state(false);
  let copied = $state(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(build.commit);
      copied = true;
    } catch {
      // no clipboard (an insecure page): the full hash is on screen to select
    }
  }
</script>

<button
  class="unstyled version"
  class:wrapped={children}
  onclick={() => (open = true)}
  aria-label="Cell studio, version {shortVersion(build)}, details"
  title="Version {shortVersion(build)}"
>
  {#if children}{@render children()}{:else}{shortVersion(build)}{/if}{#if update.ready}<span class="dot" aria-hidden="true"></span>{/if}
</button>

{#if open}
  <Sheet label="Version" onclose={() => (open = false)}>
    {#snippet header()}<b>Version</b>{/snippet}
    <dl>
      <dt>Build</dt>
      <dd>{shortVersion(build)}</dd>
      <dt>Commit</dt>
      <dd>
        <code>{build.commit || 'unknown'}</code>
        {#if build.commit}<button class="quiet" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>{/if}
      </dd>
      <dt>Branch</dt>
      <dd>{build.branch || 'unknown'}</dd>
      <dt>Built</dt>
      <dd>{builtOn(build)}</dd>
      <dt>Package</dt>
      <dd>{build.name} {build.version}</dd>
      {#each build.dependencies as dependency (dependency.name)}
        <dt>{dependency.name}</dt>
        <dd>{dependency.version}</dd>
      {/each}
    </dl>
    {#if update.ready}
      <p class="update" role="status">
        A new version is ready. <button onclick={() => update.reload()}>Reload</button>
      </p>
    {/if}
  </Sheet>
{/if}

<style>
  .version {
    display: block;
    padding: 2px 0;
    font: 500 10.5px/1 var(--font-ui);
    letter-spacing: 0.02em;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .version.wrapped {
    display: flex;
    align-items: center;
    padding: 0;
  }
  .version:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
  .dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-left: 4px;
    border-radius: 50%;
    background: var(--accent);
  }
  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 6px 14px;
    margin: 0;
    font-size: 14px;
  }
  dt {
    color: var(--text-muted);
  }
  dd {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  code {
    font-size: 12px;
  }
  button.quiet {
    background: none;
    border: 0;
    color: var(--text-muted);
    font: inherit;
    cursor: pointer;
  }
  .update {
    margin: var(--space-3) 0 0;
    font-size: 14px;
  }
  .update button {
    background: var(--accent);
    color: var(--accent-ink);
    border: 0;
    border-radius: 6px;
    padding: 4px 10px;
    font: inherit;
    cursor: pointer;
  }
</style>
