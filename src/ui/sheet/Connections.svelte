<script lang="ts">
  /** Everything a cell connects to, by how they relate (plays on, used by …), each cell a link. */
  import { connections } from '../../layout/describe';
  import { getGraphContext } from '../context';
  import CellLink from '../CellLink.svelte';
  import Section from './Section.svelte';

  let { name }: { name: string } = $props();

  const ctx = getGraphContext();
  const links = $derived(ctx.program.cells.get(name) ? connections(ctx.program, name) : []);
</script>

{#if links.length}
  <Section title="Connections">
    <dl class="links">
      {#each links as l (l.relation)}
        <dt>{l.relation}</dt>
        <dd>
          {#each l.cells as c (c)}<CellLink name={c} />{/each}
        </dd>
      {/each}
    </dl>
  </Section>
{/if}

<style>
  .links {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 6px 14px;
    margin: 0;
    font-size: 14px;
  }
  .links dt {
    color: var(--text-muted);
  }
  .links dd {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    line-height: 1.5;
  }
</style>
