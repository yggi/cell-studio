<script lang="ts" module>
  // (each wheel's own ids for its name paths: a piece can be shown twice at once, in the list and its details)
  let wheels = 0;
</script>

<script lang="ts">
  /**
   * A piece as a wheel, the same wherever it's shown (cards, the library's graph,
   * a piece's details): its own graph in miniature inside, its tags round the rim —
   * a braid of tags, each in its colour, named along its arc when there's room.
   */
  import MiniGraph from './MiniGraph.svelte';
  import type { Miniature } from '../layout/miniature';
  import { tagName } from '../engine/tags';
  import { arcPath, ringSegment } from '../layout/geometry';

  let {
    id,
    source,
    stored,
    tags,
    colours,
    size,
    labels = false,
    current = false,
    miniature = true,
  }: {
    id: string;
    /** Its text, or how to get it. */
    source: string | (() => Promise<string>);
    /** Its miniature, made at build time (an example); else worked out from its text. */
    stored?: Miniature | null;
    tags: readonly string[];
    colours: ReadonlyMap<string, string>;
    /** Across, in px. */
    size: number;
    /** Name each tag along its arc. */
    labels?: boolean;
    current?: boolean;
    /** Its graph inside (else an empty disc: the library while it grows). */
    miniature?: boolean;
  } = $props();

  const R = 100; // drawn in a 200 × 200 box
  // names along the rim when they can be read: at least 7 px on screen (the drawing is 200 units across), and
  // the largest is 15 units, so not on a wheel under ~94 px
  const least = $derived((7 * 200) / size);
  const named = $derived(labels && least <= 15);
  const ring = $derived(named ? 24 : 14); // the rim's width: room for names, or a band of colour
  const inner = $derived(R - ring - 2);
  const uid = `pw${++wheels}`;
  const segments = $derived.by(() => {
    const n = Math.max(1, tags.length);
    const gap = tags.length > 1 ? 0.012 : 0;
    const mid = R - ring / 2 - 1;
    return tags.map((t, i) => {
      const name = tagName(t); // (what's written on the arc: the name, not its kind)
      const t0 = i / n + gap / 2;
      const t1 = (i + 1) / n - gap / 2;
      // (one tag is a whole ring: ringSegment draws it as two arcs, an arc from a point to itself being none)
      const whole = t1 - t0 >= 1;
      const d = ringSegment(R, R, R - ring - 1, R - 1, t0, t1);
      // a name along the arc: on the lower half it runs the other way, so it never reads upside down
      // (a whole ring's name runs over the top half)
      const [n0, n1] = whole ? [-0.25, 0.25] : [t0, t1];
      const centre = (n0 + n1) / 2;
      const back = centre > 0.25 && centre < 0.75;
      const room = 2 * Math.PI * mid * (n1 - n0);
      const font = Math.max(least, 9, Math.min(15, room / (0.62 * name.length)));
      const fits = Math.floor(room / (0.62 * font));
      return { t, d, path: arcPath(R, R, mid, n0, n1, back), font, text: name.length <= fits ? name : name.slice(0, Math.max(1, fits - 1)) + '…', name };
    });
  });
</script>

<div class="wheel" data-wheel="piece" class:current style:width="{size}px" style:height="{size}px">
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <circle cx={R} cy={R} r={R - 0.5} class="back" />
    {#each segments as s, i (i)}
      <!-- (a picture: a tap anywhere on the wheel is the piece's; tags are chosen as chips) -->
      <path d={s.d} fill-rule="evenodd" style:fill={colours.get(s.t) ?? 'var(--wheel-ref)'}><title>{s.name}</title></path>
      {#if named}
        <path id="{uid}-{i}" d={s.path} fill="none" />
        <text class="name" font-size={s.font} dy="0.35em"><textPath href="#{uid}-{i}" startOffset="50%" text-anchor="middle">{s.text}</textPath></text>
      {/if}
    {/each}
  </svg>
  <div class="inside" style:inset="{((R - inner) / (2 * R)) * 100}%">
    {#if miniature}<MiniGraph {id} {source} {stored} round />{/if}
  </div>
</div>

<style>
  .wheel {
    position: relative;
    flex: none;
    border-radius: 50%;
  }
  .wheel.current {
    box-shadow:
      0 0 0 2px var(--accent),
      0 0 16px color-mix(in oklab, var(--accent) 50%, transparent);
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .back {
    fill: var(--wheel-disc);
    stroke: var(--line);
    stroke-width: 1;
  }
  .name {
    pointer-events: none; /* (a tag's name: a tap on it is a tap on its segment) */
    font-family: var(--font-ui);
    font-weight: 800;
    fill: var(--ink-on-note);
    letter-spacing: 0.02em;
  }
  .inside {
    pointer-events: none; /* (a picture: taps go to the piece) */
    position: absolute;
    border-radius: 50%;
    overflow: hidden;
    background: var(--wheel-disc);
  }
</style>
