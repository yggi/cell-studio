<script lang="ts">
  /**
   * The piano roll's key column: one on-screen key per row, aligned with the rows, top the highest. A key reports press
   * and release (a live note on the cell's voice, once #207's `press`/`release` are wired) and lights while held. The
   * pointer pattern is Jambot's (`apps/web/src/components/Keyboard.svelte` @ 8cdb6b8): capture on press (in a try: a
   * synthetic or vanished pointer can't be captured), release on up, cancel or a lost capture, so no key sticks.
   */
  import type { Row } from '../layout/roll';

  let {
    rows,
    rowHeight,
    held,
    colourOf,
    onpress,
    onrelease,
  }: {
    /** Top to bottom: the highest row first. */
    rows: readonly Row[];
    rowHeight: number;
    /** Rows sounding now (pressed here, or held from elsewhere): lit. */
    held: ReadonlySet<number>;
    colourOf: (row: Row) => string;
    onpress: (value: number) => void;
    onrelease: (value: number) => void;
  } = $props();

  // which pointer holds which key (a finger each, on a phone)
  const down = new Map<number, number>();
  function press(e: PointerEvent, value: number) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* (not capturable: the release still comes as pointerup) */
    }
    if (down.has(e.pointerId)) return;
    down.set(e.pointerId, value);
    onpress(value);
  }
  function release(e: PointerEvent) {
    const value = down.get(e.pointerId);
    if (value === undefined) return;
    down.delete(e.pointerId);
    onrelease(value);
  }
  // the keyboard: Enter or Space holds a key while down
  let keyed: number | null = null;
  function keydown(e: KeyboardEvent, value: number) {
    if ((e.key !== 'Enter' && e.key !== ' ') || e.repeat) return;
    e.preventDefault();
    if (keyed !== null) onrelease(keyed);
    keyed = value;
    onpress(value);
  }
  function keyup() {
    if (keyed === null) return;
    onrelease(keyed);
    keyed = null;
  }
</script>

<div class="keys" role="group" aria-label="Keys">
  {#each rows as row (row.value)}
    <button
      type="button"
      class="key"
      class:black={row.black}
      class:first={row.index === 0}
      class:on={held.has(row.value)}
      style:height="{rowHeight}px"
      style:--swatch={colourOf(row)}
      aria-label="Play {row.label}"
      aria-pressed={held.has(row.value)}
      onpointerdown={(e) => press(e, row.value)}
      onpointerup={release}
      onpointercancel={release}
      onlostpointercapture={release}
      onkeydown={(e) => keydown(e, row.value)}
      onkeyup={keyup}
      onblur={keyup}
      oncontextmenu={(e) => e.preventDefault()}
    >
      <span class="dot" aria-hidden="true"></span><span class="name">{row.label}</span>
    </button>
  {/each}
</div>

<style>
  .keys {
    display: flex;
    flex-direction: column;
    width: 52px;
    flex: none;
  }
  .key {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px 0 5px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--bg);
    font: 500 9.5px/1 var(--font-code);
    color: var(--text-muted);
    cursor: pointer;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  .key.black {
    background: var(--code-bg);
    color: var(--text-faint);
  }
  /* a lap's first entry (a tonic, a C): its name in full ink */
  .key.first {
    color: var(--text);
  }
  .key.on {
    background: color-mix(in oklab, var(--swatch) 55%, var(--surface-2));
    color: var(--ink-on-note);
  }
  .key:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .dot {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--swatch);
  }
  .name {
    overflow: hidden;
    white-space: nowrap;
  }
</style>
