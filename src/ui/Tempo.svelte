<script lang="ts">
  /**
   * The tempo of the meter that drives the piece (its free() value, as in the graph), in the transport: a number. Drag it
   * (right or up: faster), press it for a slider, or ↑ ↓ on it. Gold while held by hand (Revert · Save beside).
   */
  let {
    tempo,
    held,
    onchange,
    up = false,
  }: {
    tempo: { readonly value: number; readonly lo: number; readonly hi: number };
    /** Moved by hand (not yet saved). */
    held: boolean;
    onchange: (v: number) => void;
    /** The slider opens above (the transport at the foot of a phone). */
    up?: boolean;
  } = $props();

  let open = $state(false);
  let wrap: HTMLElement | undefined = $state();
  const clamp = (v: number) => Math.max(tempo.lo, Math.min(tempo.hi, v));
  const step = $derived((tempo.hi - tempo.lo) / 100);

  // a drag changes it; a press without one opens the slider
  let start: { x: number; y: number; v: number } | null = null;
  let dragged = false;
  const ondown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY, v: tempo.value };
    dragged = false;
  };
  const onmove = (e: PointerEvent) => {
    if (!start) return;
    const d = e.clientX - start.x - (e.clientY - start.y);
    if (!dragged && Math.abs(d) < 4) return;
    dragged = true;
    onchange(clamp(start.v + (d * (tempo.hi - tempo.lo)) / 240));
  };
  const onup = () => (start = null);
  const onclick = () => {
    if (!dragged) open = !open;
    dragged = false;
  };
  const onkey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : e.key === 'Escape' && open ? 0 : null;
    if (d === null) return;
    e.preventDefault();
    if (d) onchange(clamp(tempo.value + d * step));
    else open = false;
  };
  // (open: a press elsewhere closes it)
  $effect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrap?.contains(e.target as Node)) open = false;
    };
    window.addEventListener('pointerdown', away, true);
    return () => window.removeEventListener('pointerdown', away, true);
  });
</script>

<span class="tempo" bind:this={wrap}>
  <button
    class="unstyled value"
    class:held
    aria-label="Tempo {Math.round(tempo.value)}: drag, or press for a slider"
    aria-expanded={open}
    title="Tempo: drag, or press for a slider"
    onpointerdown={ondown}
    onpointermove={onmove}
    onpointerup={onup}
    onpointercancel={onup}
    {onclick}
    onkeydown={onkey}><small aria-hidden="true">♩</small>{Math.round(tempo.value)}</button
  >
  <!-- (always there, only out of sight until pressed: a screen reader or a script reaches the slider itself; focused, it shows) -->
  <span class="pop" class:up class:open>
    <input
      type="range"
      min={tempo.lo}
      max={tempo.hi}
      {step}
      value={tempo.value}
      aria-label="Tempo"
      oninput={(e) => onchange(+(e.currentTarget as HTMLInputElement).value)}
      onfocus={() => (open = true)}
      onkeydown={(e) => e.key === 'Escape' && (open = false)}
    />
    <span class="range" aria-hidden="true">{Math.round(tempo.lo)}–{Math.round(tempo.hi)}</span>
  </span>
</span>

<style>
  .tempo {
    position: relative;
    flex: none;
    display: flex;
  }
  .value {
    display: flex;
    align-items: baseline;
    gap: 3px;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    font: 700 var(--text-sm) var(--font-code);
    font-variant-numeric: tabular-nums;
    color: var(--text);
    cursor: ew-resize;
    touch-action: none;
  }
  .value:hover,
  .value[aria-expanded='true'] {
    background: var(--surface-2);
  }
  .value:focus-visible {
    outline: 2px solid var(--accent);
  }
  .value small {
    font: 400 15px/1 var(--font-ui);
    color: var(--text-muted);
  }
  .held {
    color: var(--accent);
  }
  .pop {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 220px;
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface-2);
    box-shadow: var(--shadow-strong);
  }
  .pop.up {
    top: auto;
    bottom: calc(100% + 10px);
  }
  .pop:not(.open) {
    clip-path: inset(50%);
    opacity: 0;
    pointer-events: none;
  }
  .pop input {
    width: 100%;
    margin: 0;
    accent-color: var(--accent);
  }
  .range {
    font: 500 var(--text-xs) var(--font-code);
    color: var(--text-faint);
  }
</style>
