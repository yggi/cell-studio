<script lang="ts">
  /**
   * How a `use` line's group could be drawn (#480, cells decision 054's rung 5): the real Graph on pieces that use
   * fragments, each option a column, its group drawn over the graph from where the nodes are (a mock-up's overlay, not
   * the app's). `node tools/gallery.mjs uses`. Options: a wash behind the members, a frame round them, a tag on each, a
   * shelf of the uses over the graph (what nothing reads folded into it); and `app`, the graph as the app draws it: a
   * cluster per use, named by its line, what nothing reads folded into that name (src/layout/uses.ts).
   */
  import { onMount } from 'svelte';
  import { liveAt } from '@yggi/cells/engine/live';
  import Graph from '../../../src/ui/Graph.svelte';
  import { buildGraph } from '../../../src/layout/drawn';
  import { useGroups, type UseGroup } from '../../../src/layout/uses';
  import { noteColour } from '../../../src/ui/theme';
  import { pieceOf } from '../pieces';
  import { madeUpSound } from '../sound';

  const KIT = 'use * from "core kit"\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh [&bd,&hh]';
  const SOURCES = {
    kit: KIT,
    override: `${KIT}\n&sd s=white hpf=900 distort=.6 env=&(map=adsr 0 .12 0 .05)`,
    band: '&bar meter("4/4") step=110bpm\nuse * from "aeolian"\nuse * from "tonic vamp"\nuse * from "bass"\nuse * from "root bass"\nuse * from "core kit"\nuse * from "Synth-pop drums"',
  };
  const OPTIONS = ['wash', 'frame', 'tag', 'shelf', 'app'] as const;
  type Option = (typeof OPTIONS)[number];
  const only = new URLSearchParams(location.search).get('only')?.split(',').filter(Boolean) ?? [];

  const frames = Object.entries(SOURCES).flatMap(([key, src]) => {
    const p = pieceOf(key, src, 3);
    if (!p) throw new Error(`${key} does not compile`);
    // (the options drawn over the graph as it was, every given cell its own; app: as the app draws it)
    const before = buildGraph(p.program, { uses: false });
    const groups = useGroups(p.program, before);
    const folded = new Set(groups.flatMap((g) => g.folded.map((n) => `cell:${n}`)));
    return OPTIONS.filter((o) => !only.length || only.includes(o)).map((option) => {
      const model = option === 'app' ? buildGraph(p.program) : option === 'shelf' ? { ...before, nodes: before.nodes.filter((n) => !folded.has(n.id)) } : before;
      return { key: `${key}-${option}`, p, model, groups, option };
    });
  });
  const nothing = () => {};

  // ---- the overlay: each group from its members' boxes, in the frame's pixels, every frame
  type Box = { x: number; y: number; w: number; h: number };
  type Drawn = { g: UseGroup; hull: string; label: { x: number; y: number }; boxes: Box[]; hue: string };
  let drawn = $state<Record<string, Drawn[]>>({});
  const hueOf = (k: number) => noteColour(((k * 7) % 12) * 30);

  function hullOf(points: { x: number; y: number }[]): { x: number; y: number }[] {
    const ps = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const half = (list: typeof ps) => {
      const h: typeof ps = [];
      for (const p of list) {
        while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
        h.push(p);
      }
      h.pop();
      return h;
    };
    return [...half(ps), ...half([...ps].reverse())];
  }

  function measure(frame: HTMLElement, key: string, groups: readonly UseGroup[], option: Option) {
    const at = frame.getBoundingClientRect();
    const boxOf = (id: string): Box | null => {
      const el = frame.querySelector(`.svelte-flow__node[data-id="${CSS.escape(id)}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - at.left, y: r.top - at.top, w: r.width, h: r.height };
    };
    drawn[key] = groups.flatMap((g, k) => {
      const ids = option === 'shelf' ? g.nodes : [...g.nodes, ...g.folded.map((n) => `cell:${n}`)];
      const boxes = ids.map(boxOf).filter((b): b is Box => b !== null);
      const hue = hueOf(k);
      if (!boxes.length || option === 'app') return [];
      const pad = option === 'wash' ? 26 : 14;
      const pts = boxes.flatMap((b) =>
        Array.from({ length: 20 }, (_, i) => {
          const a = (i / 20) * 2 * Math.PI;
          const r = Math.max(b.w, b.h) / 2 + pad;
          return { x: b.x + b.w / 2 + r * Math.cos(a), y: b.y + b.h / 2 + r * Math.sin(a) };
        }),
      );
      const hull = pts.length ? hullOf(pts) : [];
      const top = hull.length ? hull.reduce((a, p) => (p.y < a.y ? p : a)) : { x: 40, y: 60 + 34 * k };
      const left = hull.length ? Math.min(...hull.map((p) => p.x)) : 40;
      return [{ g, hull: hull.map((p) => `${p.x},${p.y}`).join(' '), label: { x: left + 8, y: top.y - 6 }, boxes, hue }];
    });
  }

  let figures: Record<string, HTMLElement> = {};
  onMount(() => {
    let raf = 0;
    const loop = () => {
      for (const f of frames) if (figures[f.key]) measure(figures[f.key], f.key, f.groups, f.option);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });
</script>

<main>
  {#each frames as f (f.key)}
    <figure data-kind={f.key}>
      <figcaption>
        <b>{f.option}</b> · {f.key.split('-')[0]} <span>{f.groups.map((g) => `use * from "${g.id}": ${g.nodes.length} drawn, ${g.folded.length} idle`).join(' · ')}</span>
      </figcaption>
      <div class="frame opt-{f.option}" bind:this={figures[f.key]}>
        <Graph
          model={f.model}
          program={f.p.program}
          muted={new Set()}
          routed={f.p.routed}
          heads={liveAt(f.p.program, f.p.shifts, new Set(), 0)}
          transport="stopped"
          shifts={f.p.shifts}
          ontoggle={nothing}
          onturn={nothing}
          onshowcode={nothing}
          source={f.p.source}
          sound={madeUpSound(() => false)}
          onedit={nothing}
          onadd={nothing}
          onrename={nothing}
          onfree={nothing}
          focus={null}
          opened={1}
        />
        <svg class="overlay">
          {#each drawn[f.key] ?? [] as d (d.g.id)}
            {#if f.option === 'wash'}
              <polygon points={d.hull} fill={d.hue} fill-opacity="0.09" stroke="none" />
              <text x={d.label.x} y={d.label.y} fill={d.hue} class="name">use * from "{d.g.id}"</text>
            {:else if f.option === 'frame'}
              <polygon points={d.hull} fill="none" stroke={d.hue} stroke-opacity="0.7" stroke-width="1.5" stroke-dasharray="6 5" />
              <g transform="translate({d.label.x - 8},{d.label.y - 15})">
                <rect width={d.g.id.length * 7.6 + 70} height="22" rx="11" fill="var(--bg)" stroke={d.hue} stroke-opacity="0.7" />
                <text x="10" y="15" fill={d.hue} class="name">🔒 {d.g.id} · {d.g.names.length}</text>
              </g>
            {:else if f.option === 'tag'}
              {#each d.boxes as b, i (i)}
                <rect x={b.x - 4} y={b.y - 4} width={b.w + 8} height={b.h + 8} rx="14" fill="none" stroke={d.hue} stroke-opacity="0.55" stroke-dasharray="4 4" />
                <g transform="translate({b.x + b.w - 10},{b.y - 12})">
                  <rect width={d.g.id.length * 6.4 + 12} height="17" rx="8.5" fill={d.hue} />
                  <text x="6" y="12.5" class="tag">{d.g.id}</text>
                </g>
              {/each}
            {:else if f.option === 'shelf'}
              {#each d.boxes as b, i (i)}
                <circle
                  cx={b.x + b.w / 2}
                  cy={b.y + b.h / 2}
                  r={Math.max(b.w, b.h) / 2 + 5}
                  fill="none"
                  stroke={d.hue}
                  stroke-opacity="0.7"
                  stroke-width="1.5"
                  stroke-dasharray="3 4"
                />
              {/each}
            {/if}
          {/each}
        </svg>
        {#if f.option === 'shelf'}
          <ul class="shelf">
            {#each drawn[f.key] ?? [] as d (d.g.id)}
              <li style:--hue={d.hue}>
                <span class="lock">use</span>
                {d.g.id}
                {#if d.g.folded.length}<span class="dots"
                    >{#each d.g.folded as id (id)}<i title={id}></i>{/each}</span
                  ><span class="n">+{d.g.folded.length}</span>{/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </figure>
  {/each}
</main>

<style>
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
  }
  main {
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 16px;
    font-family: var(--font-ui);
  }
  figure {
    margin: 0;
  }
  figcaption {
    font: 12px var(--font-ui);
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  figcaption b {
    font-family: var(--font-code);
    color: var(--accent);
  }
  .frame {
    position: relative;
    width: 1300px;
    height: 820px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .name {
    font: 600 12px var(--font-code);
  }
  .shelf {
    position: absolute;
    left: 8px;
    top: 52px;
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    max-width: 70%;
    font: 600 12px var(--font-code);
  }
  .shelf li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border: 1.5px dashed var(--hue);
    border-radius: 999px;
    color: var(--hue);
    background: var(--bg);
  }
  .shelf .lock {
    opacity: 0.6;
    font-weight: 400;
  }
  .shelf .dots {
    display: inline-flex;
    gap: 3px;
  }
  .shelf i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    border: 1.5px solid var(--hue);
  }
  .tag {
    font: 600 10.5px var(--font-code);
    fill: var(--bg);
  }
</style>
