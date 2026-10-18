<script lang="ts">
  /** The sheet's heading: the cell's name, edited where it's shown (Enter renames, Escape puts it back); an unnamed cell, as written. */
  import { nameKeys, type Rename } from './rename.svelte';

  let { lambda, rename }: { lambda: string | null; rename: Rename } = $props();
  let input = $state<HTMLInputElement | null>(null);
</script>

{#if lambda}
  <h2 class="lambda">&amp;({lambda})</h2>
{:else}
  <label class="name" class:bad={!!rename.problem}>
    <span aria-hidden="true">&amp;</span>
    <input
      bind:value={rename.draft}
      aria-label="Name"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      style:width="{Math.max(3, rename.draft.length + 1)}ch"
      {@attach nameKeys(rename)}
      onblur={() => rename.commit()}
      bind:this={input}
    />
    <button class="unstyled pencil" type="button" aria-label="Rename" onclick={() => (input?.focus(), input?.select())}>✎</button>
  </label>
{/if}

<style>
  /* a heading you can type into */
  .name {
    display: inline-flex;
    align-items: baseline;
    min-width: 0;
    font: 700 21px/1.2 var(--font-code);
  }
  .name span {
    color: var(--text-muted);
  }
  .name input {
    all: unset;
    min-width: 3ch;
    max-width: 100%;
    font: inherit;
    color: var(--text);
    border-bottom: 1px dashed transparent;
    cursor: text;
  }
  .name input:hover,
  .name input:focus {
    border-bottom-color: var(--text-faint);
  }
  .name input:focus {
    border-bottom-color: var(--accent);
  }
  .pencil {
    margin-left: 6px;
    font: 400 15px var(--font-ui);
    color: var(--text-faint);
  }
  .pencil:hover {
    color: var(--accent);
  }
  .name.bad input {
    border-bottom-color: var(--danger);
  }
  /* (not the sheet's form widgets, CellSheet.svelte, on this one; as before the split, this also wins over the
     hover, focus and problem underlines above, so none of them shows) */
  :global(.sheet.cell-sheet) .name input {
    min-height: 0;
    padding: 0;
    border: 0;
    border-bottom: 1px dashed transparent;
    border-radius: 0;
    background: none;
    font: inherit;
  }
  .lambda {
    margin: 0;
    font: italic 700 18px/1.3 var(--font-code);
    word-break: break-word;
  }
</style>
