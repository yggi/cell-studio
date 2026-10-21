<script lang="ts">
  /**
   * Where the piece is, in the transport: its sections as segments, each named where its name fits (a run of sections
   * with one name — drop · drop — shares that name), the part played filled, the section it's in underlined. A press on a
   * name jumps to that section; anywhere else, or a drag, seeks there (on release). The keys: ← → five seconds, Page Up /
   * Down a section, Home / End. The arithmetic is timeline.ts.
   */
  import { keyTarget, segmentAt, segmentsOf, stillJump, timeAt, type Section } from './timeline';

  let {
    now,
    span,
    sections,
    onseek,
    clock,
  }: {
    /** Where it is (seconds). */
    now: number;
    /** How far it reaches (null: nothing to move in). */
    span: number | null;
    sections: readonly Section[] | null;
    onseek: (t: number) => void;
    clock: (sec: number) => string;
  } = $props();

  let track: HTMLElement | undefined = $state();
  let width = $state(300);
  /** Where a drag is (seconds), shown in place of `now` until it's let go. */
  let drag = $state<number | null>(null);
  const shown = $derived(drag ?? now);

  const segments = $derived(segmentsOf(sections, span, width));
  const current = $derived(segmentAt(segments, shown));
  const at = (x: number) => timeAt(x, track!.getBoundingClientRect(), span!);
  // a press on a name jumps to its section, unless it turns into a drag
  let start: { x: number; jump: number | null } | null = null;
  const ondown = (e: PointerEvent) => {
    if (!span || e.button !== 0) return;
    track!.setPointerCapture(e.pointerId);
    const name = (e.target as HTMLElement).closest<HTMLElement>('[data-at]');
    start = { x: e.clientX, jump: name ? Number(name.dataset.at) : null };
    drag = start.jump ?? at(e.clientX);
  };
  const onmove = (e: PointerEvent) => {
    if (!start) return;
    start.jump = stillJump(start.jump, start.x, e.clientX);
    if (start.jump === null) drag = at(e.clientX);
  };
  const onup = () => {
    if (!start) return;
    start = null;
    if (drag !== null) onseek(drag);
    drag = null;
  };
  const onkey = (e: KeyboardEvent) => {
    const to = span ? keyTarget(e.key, now, span, segments) : null;
    if (to === null) return;
    e.preventDefault();
    onseek(to);
  };
</script>

{#if span}
  <div
    class="timeline"
    bind:this={track}
    bind:clientWidth={width}
    role="slider"
    tabindex="0"
    aria-label="Time: jump to any point"
    aria-valuemin={0}
    aria-valuemax={span}
    aria-valuenow={Math.round(shown)}
    aria-valuetext="{clock(shown)}{current?.label ? `, ${current.label}` : ''}"
    onpointerdown={ondown}
    onpointermove={onmove}
    onpointerup={onup}
    onpointercancel={onup}
    onkeydown={onkey}
  >
    {#each segments as s, i (i)}
      <div class="seg" class:here={s === current} style:flex-grow={s.to - s.from} title={s.named || !s.label ? undefined : `${s.label} · ${clock(s.from)}`}>
        <div class="fill" style:width="{Math.max(0, Math.min(1, (shown - s.from) / (s.to - s.from))) * 100}%"></div>
        {#each s.ticks as t (t)}<span class="tick" style:left="{((t - s.from) / (s.to - s.from)) * 100}%"></span>{/each}
        {#if s.named}<span class="name" data-at={s.from} title="{s.label} · {clock(s.from)}">{s.label}</span>{/if}
      </div>
    {/each}
  </div>
{:else}
  <!-- (nothing to move in: the bar keeps its place, so nothing jumps) -->
  <div class="timeline empty" aria-hidden="true"><div class="seg"></div></div>
{/if}

<style>
  .timeline {
    display: flex;
    gap: 2px;
    flex: 1;
    min-width: 60px;
    height: 26px;
    cursor: pointer;
    touch-action: none;
    border-radius: var(--radius-sm);
  }
  .timeline:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .empty {
    cursor: default;
    opacity: 0.4;
  }
  .seg {
    position: relative;
    flex: 1 1 0;
    min-width: 2px;
    overflow: hidden;
    display: flex;
    align-items: center;
    border-radius: 5px;
    background: var(--surface-2);
    color: var(--text-muted);
    font: 600 var(--text-xs) var(--font-ui);
    white-space: nowrap;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: color-mix(in oklab, var(--accent) 24%, var(--surface-2));
    pointer-events: none;
  }
  /* the section it's in: its name gold, underlined, the playhead the fill's edge */
  .here {
    color: var(--accent);
    box-shadow: inset 0 -2px 0 var(--accent);
  }
  .here .fill {
    border-right: 2px solid var(--text);
  }
  /* (a section that repeats the one before: a notch at the foot, not a new segment) */
  .tick {
    position: absolute;
    bottom: 0;
    height: 6px;
    width: 1px;
    background: color-mix(in oklab, var(--text-muted) 55%, transparent);
  }
  .name {
    position: relative;
    padding: 0 7px;
    line-height: 26px;
  }
  .name:hover {
    color: var(--text);
  }
</style>
