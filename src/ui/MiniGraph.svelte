<script lang="ts" module>
  /**
   * A piece's graph, small, for the picker: an example's miniature comes from the index (made at
   * build time); a saved piece's or a file's is worked out from its text (src/layout/miniature.ts),
   * one at a time, so opening the picker never stalls on thirty layouts at once.
   */
  import { miniature, miniShape, type Miniature, type MiniShape } from '../layout/miniature';
  import { miniPaint as paint } from './theme';

  const cache = new Map<string, Miniature | null>();
  const queue: (() => Promise<void>)[] = [];
  let running = false;
  function pump() {
    if (running) return;
    const next = queue.shift();
    if (!next) return;
    running = true;
    setTimeout(async () => {
      await next();
      running = false;
      pump();
    }, 0);
  }

  /** A node's fill, and whether it's drawn as a ring: the theme's, resolved now. */
</script>

<script lang="ts">
  let {
    id,
    source,
    stored,
    round = false,
  }: {
    id: string;
    /** Its text, or how to get it: only when there's no stored miniature (a saved piece, a file). */
    source: string | (() => Promise<string>);
    /** Its miniature, made at build time (an example): nothing to fetch or lay out. */
    stored?: Miniature | null;
    /** Shown in a circle (a wheel): square, and the graph kept inside it. */
    round?: boolean;
  } = $props();
  let mini = $state<Miniature | null | undefined>(undefined);
  $effect(() => {
    if (stored !== undefined) {
      mini = stored;
      return;
    }
    const key = `${id}\n${typeof source === 'string' ? source : ''}`;
    if (cache.has(key)) {
      mini = cache.get(key);
      return;
    }
    mini = undefined;
    let cancelled = false;
    queue.push(async () => {
      if (cancelled) return;
      let text: string;
      try {
        text = typeof source === 'string' ? source : await source();
      } catch {
        return; // (not fetched, say offline: no picture now, another try when it's shown again)
      }
      if (cancelled) return;
      let m: Miniature | null;
      try {
        m = miniature(text);
      } catch {
        m = null;
      }
      cache.set(key, m);
      mini = m;
    });
    pump();
    return () => (cancelled = true);
  });
  const shape = $derived<MiniShape | null>(mini ? miniShape(mini, round) : null);
</script>

<svg viewBox={shape ? shape.box.join(' ') : '0 0 100 75'} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Its graph, in miniature">
  {#if shape}
    {#each shape.edges as e}<line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke-width={shape.edge} />{/each}
    {#each shape.nodes as n}
      {@const { fill, ring } = paint(n.colour)}
      <circle cx={n.x} cy={n.y} r={n.r} style:fill={ring ? 'var(--wheel-disc)' : fill} style:stroke={ring ? fill : 'none'} stroke-width={ring ? n.r * 0.32 : 0} />
    {/each}
  {/if}
</svg>

<style>
  svg {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }
  line {
    stroke: var(--edge);
    stroke-opacity: 0.7;
  }
</style>
