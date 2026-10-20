<script lang="ts">
  /**
   * Where the piece is, in the transport: its sections as segments, each named where its name fits (a run of sections
   * with one name — drop · drop — shares that name), the part played filled, the section it's in underlined. A press on a
   * name jumps to that section; anywhere else, or a drag, seeks there (on release). The keys: ← → five seconds, Page Up /
   * Down a section, Home / End.
   */
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
    sections: readonly { readonly at: number; readonly label: string }[] | null;
    onseek: (t: number) => void;
    clock: (sec: number) => string;
  } = $props();

  let track: HTMLElement | undefined = $state();
  let width = $state(300);
  /** Where a drag is (seconds), shown in place of `now` until it's let go. */
  let drag = $state<number | null>(null);
  const shown = $derived(drag ?? now);

  // a run of sections with one name (drop · drop) is one segment, its other starts ticks inside it
  type Segment = { from: number; to: number; label: string; named: boolean; ticks: number[] };
  const segments = $derived.by((): Segment[] => {
    if (!span) return [];
    const list: Segment[] = [];
    // (before the first section: a segment without a name)
    const first = sections?.[0]?.at ?? span;
    if (first > 0) list.push({ from: 0, to: first, label: '', named: false, ticks: [] });
    for (const [i, s] of (sections ?? []).entries()) {
      const to = sections![i + 1]?.at ?? span;
      const last = list.at(-1);
      if (i > 0 && last?.label === s.label) {
        last.ticks.push(s.at);
        last.to = to;
      } else list.push({ from: s.at, to, label: s.label, named: false, ticks: [] });
    }
    for (const g of list) g.named = !!g.label && ((g.to - g.from) / span) * width > g.label.length * 6.8 + 16;
    return list;
  });
  const current = $derived(segments.find((s) => s.from <= shown + 1e-6 && shown < s.to) ?? segments.at(-1) ?? null);

  const timeAt = (x: number) => {
    const r = track!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (x - r.left) / r.width)) * span!;
  };
  // a press on a name jumps to its section, unless it turns into a drag
  let start: { x: number; jump: number | null } | null = null;
  const ondown = (e: PointerEvent) => {
    if (!span || e.button !== 0) return;
    track!.setPointerCapture(e.pointerId);
    const name = (e.target as HTMLElement).closest<HTMLElement>('[data-at]');
    start = { x: e.clientX, jump: name ? Number(name.dataset.at) : null };
    drag = start.jump ?? timeAt(e.clientX);
  };
  const onmove = (e: PointerEvent) => {
    if (!start) return;
    if (start.jump !== null && Math.abs(e.clientX - start.x) < 4) return;
    start.jump = null;
    drag = timeAt(e.clientX);
  };
  const onup = () => {
    if (!start) return;
    start = null;
    if (drag !== null) onseek(drag);
    drag = null;
  };
  const onkey = (e: KeyboardEvent) => {
    if (!span) return;
    const starts = segments.map((s) => s.from);
    const prev = [...starts].reverse().find((t) => t < now - 1) ?? 0;
    const next = starts.find((t) => t > now + 1e-6);
    const to =
      e.key === 'ArrowLeft' || e.key === 'ArrowDown'
        ? now - 5
        : e.key === 'ArrowRight' || e.key === 'ArrowUp'
          ? now + 5
          : e.key === 'PageUp'
            ? prev
            : e.key === 'PageDown'
              ? next
              : e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? span
                  : undefined;
    if (to === undefined) return;
    e.preventDefault();
    onseek(Math.max(0, Math.min(span, to)));
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
