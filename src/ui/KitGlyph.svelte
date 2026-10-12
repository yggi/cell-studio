<script lang="ts">
  /**
   * A kit (a table of voices, `&kit &kd &sd &hh`) drawn as a drum kit seen from the front (layout/kit.ts): each member a
   * piece of it by its name — a drum a shell and its head, a cymbal a brass plate seen edge-on — the kick in the middle,
   * snare and hi-hat left, toms over the kick, the floor tom right, cymbals on top. A member only the kit plays is a
   * bulb (tap to open, hold to switch off); one played elsewhere too is drawn hollow (it has a node of its own). A piece
   * glows while its voice sounds.
   */
  import { drumPlaces, kitOf } from '../layout/kit';
  import { bulbHosts } from '../layout/drawn';
  import { fitFont } from '../layout/dial';
  import { wheelGeometry } from '../layout/wheel';
  import { getGraphContext } from './context';

  let { name, size = 168 }: { name: string; size?: number } = $props();
  const ctx = getGraphContext();
  const geo = $derived(wheelGeometry(size));
  const c = $derived(geo.c);
  const members = $derived(kitOf(ctx.program, name) ?? []);
  const pieces = $derived.by(() => {
    const hosts = bulbHosts(ctx.program);
    // (drawn back to front: cymbals behind, the kick in front of the toms, the rest over it)
    const order = { crash: 0, ride: 0, hihat: 1, tom: 2, kick: 3, floor: 4, snare: 4, perc: 5 } as const;
    return drumPlaces(size * 1.02, members)
      .map((p, i) => {
        const m = members[i];
        const text = `&${m}`;
        return { ...p, name: m, x: c + p.x, y: c + p.y, bulb: hosts.get(m) === name, text, font: fitFont(p.r * 1.7, text.length, 12, 5) };
      })
      .sort((a, b) => order[a.role] - order[b.role]);
  });
  const cymbal = (role: string) => role === 'hihat' || role === 'crash' || role === 'ride';
  const key = (e: KeyboardEvent, m: string) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Enter' && e.shiftKey) ctx.toggle(`cell:${m}`);
    else ctx.open(m);
  };
</script>

<svg data-wheel="kit" width={size} height={size} viewBox="0 0 {size} {size}" role="group" aria-label="&{name}: a drum kit of {members.length}">
  <circle class="disc" cx={c} cy={c} r={geo.rDisc} />
  {#each pieces as p (p.name)}
    {@const lit = !!ctx.lit?.nodes.has(`cell:${p.name}`)}
    {@const off = !!ctx.program.cells.get(p.name)?.off}
    <g class="piece {p.role}" class:hollow={!p.bulb} class:lit class:off>
      {#if cymbal(p.role)}
        <!-- (a stand under it, the plate edge-on; a hi-hat two plates) -->
        <line class="stand" x1={p.x} y1={p.y} x2={p.x} y2={Math.min(size - geo.margin, p.y + p.r * 1.6)} />
        <ellipse class="plate" cx={p.x} cy={p.y} rx={p.r} ry={p.r * 0.26} />
        {#if p.role === 'hihat'}<ellipse class="plate" cx={p.x} cy={p.y + p.r * 0.22} rx={p.r} ry={p.r * 0.2} />{/if}
        <circle class="bell" cx={p.x} cy={p.y - p.r * 0.06} r={p.r * 0.13} />
      {:else}
        <circle class="shell" cx={p.x} cy={p.y} r={p.r} />
        <circle class="head" cx={p.x} cy={p.y} r={p.r * 0.8} />
        {#if p.role === 'kick'}{#each [0, 1, 2, 3, 4, 5, 6, 7] as k (k)}<circle
              class="lug"
              cx={p.x + Math.cos((k * Math.PI) / 4) * p.r * 0.9}
              cy={p.y + Math.sin((k * Math.PI) / 4) * p.r * 0.9}
              r={Math.max(0.8, p.r * 0.04)}
            />{/each}{/if}
      {/if}
      {#if p.font}<text class="label" x={p.x} y={cymbal(p.role) ? p.y - p.r * 0.45 - p.font * 0.5 : p.y} dy="0.35em" style:font-size="{p.font}px">{p.text}</text>{/if}
      {#if p.bulb}<circle
          class="bulb-hit"
          data-bulb={p.name}
          role="button"
          tabindex="0"
          aria-label={`&${p.name}, the kit's ${p.role}: open it; Shift+Enter switches it ${off ? 'on' : 'off'}`}
          aria-keyshortcuts="Enter Shift+Enter"
          onkeydown={(e) => key(e, p.name)}
          cx={p.x}
          cy={p.y}
          r={p.r}
        />{/if}
    </g>
  {/each}
</svg>

<style>
  .disc {
    fill: var(--wheel-disc);
    stroke: var(--wheel-ref);
    stroke-width: 2;
  }
  .shell {
    fill: var(--kit-shell);
    stroke: var(--wheel-ref);
    stroke-width: 1.5;
  }
  .head {
    fill: var(--kit-head);
    opacity: 0.85;
  }
  .lug {
    fill: var(--wheel-tick);
  }
  .plate {
    fill: var(--kit-cymbal);
    stroke: var(--kit-cymbal-edge);
    stroke-width: 1;
  }
  .bell {
    fill: var(--kit-cymbal-edge);
  }
  .stand {
    stroke: var(--wheel-tick);
    stroke-width: 1.5;
  }
  .label {
    fill: var(--ink-on-note);
    font-weight: 700;
    text-anchor: middle;
    pointer-events: none;
  }
  .hihat .label,
  .crash .label,
  .ride .label {
    fill: var(--text);
  }
  .hollow .shell,
  .hollow .plate {
    fill: none;
    stroke-dasharray: 2 3;
  }
  .hollow .head {
    opacity: 0.2;
  }
  .lit .head,
  .lit .plate {
    filter: brightness(1.35) drop-shadow(0 0 4px var(--accent));
  }
  .off {
    opacity: 0.4;
  }
  .bulb-hit {
    fill: transparent;
    cursor: pointer;
  }
  .bulb-hit:focus-visible {
    outline: none;
    stroke: var(--accent);
    stroke-width: 2;
  }
</style>
