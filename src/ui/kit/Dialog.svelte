<script lang="ts">
  /**
   * A modal pop-up over everything: a scrim (a tap on it closes), a panel near the top, and the focus
   * held inside while it's open (kit/attach.ts `trap`; Escape closes). Its content is the children.
   */
  import type { Snippet } from 'svelte';
  import { trap } from './attach';

  let {
    label,
    onclose,
    width = 400,
    focus = 'self',
    children,
  }: {
    label: string;
    onclose: () => void;
    /** Its width at most (px; a phone's narrower screen less a margin). */
    width?: number;
    /** Where the focus goes when it opens, unless a control is marked autofocus (attach.ts `trap`). */
    focus?: string | 'self';
    children: Snippet;
  } = $props();
</script>

<div class="backdrop" onclick={onclose} role="presentation"></div>
<div class="pop" role="dialog" aria-label={label} aria-modal="true" tabindex="-1" style:width="min({width}px, calc(100vw - 24px))" {@attach trap({ onescape: () => onclose(), focus })}>
  {@render children()}
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: var(--scrim);
  }
  .pop {
    position: fixed;
    z-index: 61;
    left: 50%;
    top: 22%;
    transform: translateX(-50%);
    padding: 10px;
    border-radius: 14px;
    background: var(--surface);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-strong);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pop:focus {
    outline: none;
  }
</style>
