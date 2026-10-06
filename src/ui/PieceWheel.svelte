<script lang="ts">
  /**
   * A piece as a wheel, the same wherever it's shown (cards, the library's graph,
   * a piece's details): its own graph in miniature inside, its tags round the rim —
   * a braid of tags, each in its colour, named along its arc when there's room.
   */
  import MiniGraph from './MiniGraph.svelte';
  import { tagName } from '../engine/tags';

  let {
    id,
    source,
    layout = null,
    tags,
    colours,
    size,
    labels = false,
    current = false,
    ontag,
  }: {
    id: string;
    /** Its text, or how to get it. */
    source: string | (() => Promise<string>);
    layout?: Readonly<Record<string, readonly [number, number]>> | null;
    tags: readonly string[];
    colours: ReadonlyMap<string, string>;
    /** Across, in px. */
    size: number;
    /** Name each tag along its arc. */
    labels?: boolean;
    current?: boolean;
    /** A tag on the rim, clicked: choose it (instead of the piece). */
    ontag?: (t: string) => void;
  } = $props();

  const R = 100; // drawn in a 200 × 200 box
  const ring = $derived(labels ? 24 : 14); // the rim's width: room for names, or a band of colour
  const inner = $derived(R - ring - 2);
  const uid = $derived(`pw-${id.replace(/[^A-Za-z0-9_-]/g, '_')}-${labels ? 'l' : 'p'}`);
  const at = (r: number, turn: number) => {
    const a = turn * 2 * Math.PI - Math.PI / 2;
    return [R + r * Math.cos(a), R + r * Math.sin(a)] as const;
  };
  const arc = (r: number, t0: number, t1: number, back = false) => {
    const [x0, y0] = at(r, back ? t1 : t0);
    const [x1, y1] = at(r, back ? t0 : t1);
    return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${t1 - t0 > 0.5 ? 1 : 0} ${back ? 0 : 1} ${x1.toFixed(2)},${y1.toFixed(2)}`;
  };
  const segments = $derived.by(() => {
    const n = Math.max(1, tags.length);
    const gap = tags.length > 1 ? 0.012 : 0;
    const mid = R - ring / 2 - 1;
    return tags.map((t, i) => {
      const name = tagName(t); // (what's written on the arc: the name, not its kind)
      const t0 = i / n + gap / 2;
      const t1 = (i + 1) / n - gap / 2;
      const [ox0, oy0] = at(R - 1, t0);
      const [ox1, oy1] = at(R - 1, t1);
      const [ix1, iy1] = at(R - ring - 1, t1);
      const [ix0, iy0] = at(R - ring - 1, t0);
      const large = t1 - t0 > 0.5 ? 1 : 0;
      const d = `M${ox0},${oy0} A${R - 1},${R - 1} 0 ${large} 1 ${ox1},${oy1} L${ix1},${iy1} A${R - ring - 1},${R - ring - 1} 0 ${large} 0 ${ix0},${iy0}Z`;
      // a name along the arc: on the lower half it runs the other way, so it never reads upside down
      const centre = (t0 + t1) / 2;
      const back = centre > 0.25 && centre < 0.75;
      const room = 2 * Math.PI * mid * (t1 - t0);
      const font = Math.max(9, Math.min(15, room / (0.62 * name.length)));
      const fits = Math.floor(room / (0.62 * font));
      return { t, d, path: arc(mid, t0, t1, back), font, text: name.length <= fits ? name : name.slice(0, Math.max(1, fits - 1)) + '…', name };
    });
  });
</script>

<div class="wheel" class:current style:width="{size}px" style:height="{size}px">
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <circle cx={R} cy={R} r={R - 0.5} class="back" />
    {#each segments as s, i (s.t)}
      <path
        d={s.d}
        class:tappable={!!ontag}
        style:fill={colours.get(s.t) ?? 'var(--wheel-ref)'}
        onclick={(e) => {
          if (!ontag) return;
          e.stopPropagation();
          ontag(s.t);
        }}
        onpointerdown={(e) => ontag && e.stopPropagation()}
        role={ontag ? 'button' : undefined}
        aria-label={ontag ? `the tag ${s.name}` : undefined}
      ><title>{s.name}</title></path>
      {#if labels}
        <path id="{uid}-{i}" d={s.path} fill="none" />
        <text class="name" font-size={s.font} dy="0.35em"><textPath href="#{uid}-{i}" startOffset="50%" text-anchor="middle">{s.text}</textPath></text>
      {/if}
    {/each}
  </svg>
  <div class="inside" style:inset="{((R - inner) / (2 * R)) * 100}%">
    <MiniGraph {id} {source} {layout} round />
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
    pointer-events: none; /* (a picture: taps go to the piece, or the tag on the rim) */
    position: absolute;
    border-radius: 50%;
    overflow: hidden;
    background: var(--wheel-disc);
  }
  path.tappable {
    cursor: pointer;
    transition: filter 120ms ease;
  }
  path.tappable:hover {
    filter: brightness(1.25);
  }
</style>
