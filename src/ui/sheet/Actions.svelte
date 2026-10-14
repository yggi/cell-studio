<script lang="ts">
  /** What you can do with a cell: switch it on and off, pin it, show it in the code, delete it (asked first). */
  import { deleteCell, usersOf } from '@yggi/cells/engine/edit';
  import { getGraphContext } from '../context';

  let {
    name,
    source,
    deletable,
    pinned,
    onpin,
    onshowcode,
    onclose,
    onedit,
  }: {
    name: string;
    source: string;
    /** Written on a line of its own (an unnamed cell isn't: it goes with the line it's in). */
    deletable: boolean;
    pinned: boolean;
    onpin: () => void;
    onshowcode: () => void;
    onclose: () => void;
    onedit: (source: string) => void;
  } = $props();

  const ctx = getGraphContext();
  const off = $derived(ctx.program.cells.get(name)?.off ?? false);
  let confirming = $state(false);
  const users = $derived(usersOf(source, name));
</script>

<footer class="actions">
  {#if confirming}
    <div class="confirm" role="alertdialog" aria-label="Delete &{name}?">
      <p>
        Delete <b>&amp;{name}</b>?{#if users.length}{` It's used by ${users.map((u) => '&' + u).join(', ')}, which will show an error until changed.`}{/if}
      </p>
      <div class="row">
        <button
          class="btn danger"
          onclick={() => {
            // compute first: closing tears the sheet (and its props) down
            const next = deleteCell(source, name);
            const edit = onedit;
            confirming = false;
            onclose();
            edit(next);
          }}>Delete</button
        >
        <button class="btn" onclick={() => (confirming = false)}>Keep it</button>
      </div>
    </div>
  {:else}
    <button class="btn switch" class:on={!off} onclick={() => ctx.toggle(`cell:${name}`)} aria-pressed={!off}>
      <span class="dot" aria-hidden="true"></span>{off ? 'Off' : 'On'}
    </button>
    <button class="btn" class:on={pinned} onclick={onpin} aria-pressed={pinned}>{pinned ? 'Pinned' : 'Pin'}</button>
    <button class="btn" onclick={onshowcode}>Show in code</button>
    {#if deletable}<button class="unstyled delete" onclick={() => (confirming = true)}>Delete…</button>{/if}
  {/if}
</footer>

<style>
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  .btn {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 600 14px var(--font-ui);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .btn.on {
    border-color: var(--accent);
    color: var(--accent);
  }
  .switch .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-faint);
  }
  .switch.on .dot {
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent);
  }
  .delete {
    margin-left: auto;
    padding: 8px 4px;
    font: 600 13.5px var(--font-ui);
    color: color-mix(in oklab, var(--danger) 80%, var(--text-muted));
  }
  .confirm {
    flex: 1;
    border: 1px solid var(--danger);
    border-radius: 10px;
    padding: 10px 12px;
  }
  .confirm p {
    margin: 0 0 8px;
    font-size: 14px;
  }
  .confirm .row {
    display: flex;
    gap: 8px;
  }
  .btn.danger {
    background: var(--danger);
    border-color: var(--danger);
    color: var(--ink-on-note);
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
