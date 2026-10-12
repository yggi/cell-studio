<script lang="ts">
  /** The numbers a cell leaves free (free(…)): first-class controls, here as on its node. */
  import { getGraphContext } from '../context';
  import FreeControl from '../FreeControl.svelte';
  import Section from './Section.svelte';

  let { name }: { name: string } = $props();

  const ctx = getGraphContext();
  const frees = $derived(ctx.program.cells.get(name)?.frees ?? []);
</script>

{#if frees.length}
  <Section label="Controls">
    {#each frees as f, i (i)}
      <FreeControl {f} onfree={(s, v) => ctx.setFree(s, v)} variant="large" owner={name} />
    {/each}
  </Section>
{/if}
