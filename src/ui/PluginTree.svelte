<svelte:options namespace="svg" />

<script lang="ts">
  /** A plugin's drawing: the elements `draw` returned, from the allow-list (pluginTree.ts), inside the node's own svg. */
  import { attributesOf, TAGS, type PNode } from './pluginTree';

  let { roots }: { roots: readonly PNode[] } = $props();
</script>

{#snippet part(n: PNode)}
  {#if typeof n === 'object'}
    {#if TAGS.has(n.t)}
      <svelte:element this={n.t} xmlns="http://www.w3.org/2000/svg" {...attributesOf(n)}>
        {#each n.c as c, i (i)}{@render part(c)}{/each}
      </svelte:element>
    {/if}
  {:else}{n}{/if}
{/snippet}

{#each roots as n, i (i)}{@render part(n)}{/each}
