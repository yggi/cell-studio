<script lang="ts">
  /**
   * A modal sheet rising from the bottom edge (`.bottom-sheet`, app.css): a scrim behind it (a tap on it closes),
   * the focus held inside while it's open (kit/attach.ts `trap`), Escape closes, wherever the focus is. Its header
   * (the `header` snippet, then a Close button) stays put as it scrolls; without one there is no header at all.
   * `side`: on a wide screen (≥ 900 px) the inspector's page instead (Sidebar.svelte: the pane at the right, which says
   * where its page is in `--inspect-*`), not modal: no scrim, the focus free, what's beside it in reach. Its own look
   * beyond that (padding, a wide screen's place) comes from the parent's `class`, styled with `:global`.
   * `kit/Dialog` is the centred pop-up.
   */
  import type { Snippet } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { trap } from './attach';

  let {
    label,
    onclose,
    side = false,
    hidden = false,
    layer = 40,
    focus = 'self',
    class: className = '',
    header,
    children,
  }: {
    label: string;
    onclose: () => void;
    side?: boolean;
    /** Kept, not shown (`side` on a wide screen: the inspector on another page). */
    hidden?: boolean;
    /** The scrim's z-index; the sheet sits one above it (40: under the centred pop-ups, kit/Dialog's 60). */
    layer?: number;
    /** Where the focus goes when it opens, unless a control is marked autofocus (attach.ts `trap`). */
    focus?: string | 'self';
    class?: string;
    /** What the header shows left of the Close button (a title, a name to edit). */
    header?: Snippet;
    children?: Snippet;
  } = $props();

  const wide = new MediaQuery('min-width: 900px');
  // (a side sheet on a wide screen is a pane: the rest stays live beside it)
  const pane = $derived(side && wide.current);
  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !hidden && !e.defaultPrevented) onclose();
  }
</script>

<svelte:window {onkeydown} />

{#if !pane}<div class="backdrop" style:z-index={layer} onclick={onclose} role="presentation"></div>{/if}
<div
  class={['bottom-sheet', 'sheet', pane && 'pane', className]}
  hidden={pane && hidden}
  style:z-index={layer + 1}
  role={pane ? 'region' : 'dialog'}
  aria-label={label}
  aria-modal={pane ? undefined : 'true'}
  tabindex="-1"
  {@attach pane ? undefined : trap({ onescape: () => onclose(), focus })}
>
  {#if header}
    <header>
      {@render header()}
      <button class="unstyled close" onclick={onclose} aria-label="Close">×</button>
    </header>
  {/if}
  {@render children?.()}
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--scrim);
  }
  .sheet {
    max-height: 88svh;
    padding: var(--space-3) 14px calc(var(--space-3) + env(safe-area-inset-bottom));
    box-shadow: var(--shadow);
    animation: rise 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .sheet:focus {
    outline: none;
  }
  @keyframes rise {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
  }
  /* the inspector's page: where the pane says it is, flush, no shadow of its own */
  .sheet.pane {
    left: var(--inspect-left);
    right: auto;
    top: var(--inspect-top);
    width: var(--inspect-width);
    height: var(--inspect-height);
    bottom: auto;
    max-height: none;
    border-radius: 0;
    box-shadow: none;
    animation: none;
  }
  /* (the inspector's own Close is the one) */
  .sheet.pane .close {
    display: none;
  }
  .sheet[hidden] {
    display: none;
  }

  /* the header stays put as the sheet scrolls: the Close button is always in reach */
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    position: sticky;
    top: 0;
    z-index: 3;
    background: var(--surface);
  }
  .close {
    flex: none;
    font-size: 26px;
    line-height: 1;
    padding: 2px 8px;
    border-radius: 8px;
    color: var(--text-muted);
  }
</style>
