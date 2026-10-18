<script lang="ts">
  /**
   * A modal sheet rising from the bottom edge (`.bottom-sheet`, app.css): a scrim behind it (a tap on it closes),
   * the focus held inside while it's open (kit/attach.ts `trap`), Escape closes, wherever the focus is. Its header
   * (the `header` snippet, then a Close button) stays put as it scrolls; without one there is no header at all.
   * `side`: on a wide screen (≥ 900 px) a panel at the window's right instead, 380 px wide from 76 px down, over a
   * clear scrim, so what's beside it stays in view (Graph.svelte makes room for it by that geometry). Its own look
   * beyond that (padding, a wide screen's place) comes from the parent's `class`, styled with `:global`.
   * `kit/Dialog` is the centred pop-up.
   */
  import type { Snippet } from 'svelte';
  import { trap } from './attach';

  let {
    label,
    onclose,
    side = false,
    layer = 40,
    focus = 'self',
    class: className = '',
    header,
    children,
  }: {
    label: string;
    onclose: () => void;
    side?: boolean;
    /** The scrim's z-index; the sheet sits one above it (40: under the centred pop-ups, kit/Dialog's 60). */
    layer?: number;
    /** Where the focus goes when it opens, unless a control is marked autofocus (attach.ts `trap`). */
    focus?: string | 'self';
    class?: string;
    /** What the header shows left of the Close button (a title, a name to edit). */
    header?: Snippet;
    children?: Snippet;
  } = $props();

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !e.defaultPrevented) onclose();
  }
</script>

<svelte:window {onkeydown} />

<div class="backdrop" class:side style:z-index={layer} onclick={onclose} role="presentation"></div>
<div
  class={['bottom-sheet', 'sheet', side && 'side', className]}
  style:z-index={layer + 1}
  role="dialog"
  aria-label={label}
  aria-modal="true"
  tabindex="-1"
  {@attach trap({ onescape: () => onclose(), focus })}
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
  @media (min-width: 900px) {
    .backdrop.side {
      background: transparent;
    }
    .sheet.side {
      left: auto;
      right: 16px;
      top: 76px;
      bottom: 16px;
      width: 380px;
      max-height: none;
      border-radius: 14px;
      border: 1px solid var(--line);
    }
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
