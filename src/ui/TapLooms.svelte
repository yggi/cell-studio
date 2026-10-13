<script lang="ts">
  /**
   * The selectors as the tower layout draws them (taploom.ts, docs/notes/tower-strip.md): each a pill, its loom inside.
   * At its bottom the selector: a hub, its arms out to a contact a tap in a flat fan, and two ports on the pill's edge
   * where the wires come in, the meter it steps on (white) and its selection. The clock comes in white and passes through along the bypass at
   * the bottom, a meter's trace as any; each tap a lane of its own over the fan, the clock tinted its section's colour
   * (partColour) — a prism, one white in, its spectrum out. The outputs are bulbs along the pill's top, each wire
   * leaving straight up. Behind the cells, in the graph's coordinates.
   */
  import type { Loom } from '../layout/physics';
  import { tapTint } from './theme';

  let { looms }: { looms: readonly Loom[] } = $props();
  // (the raw clock: white; a tap's: the clock tinted its section's colour)
  const tint = (tap: number, n: number) => (tap < 0 ? 'var(--meter-0)' : tapTint(tap, n));
  const drawn = $derived(
    looms.map((l) => {
      const n = Math.max(1, l.contacts.length);
      const strands = l.strands.map((s) => ({ id: `${l.table}:${s.bulb}:${s.to}`, d: s.d, colour: tint(s.tap, n) }));
      // (an output a riser: where it leaves the pill's top, one bulb each)
      const outs = new Map<string, { x: number; colour: string }>();
      for (const s of l.strands) {
        if (s.join) continue;
        const x = s.pieces[2][0];
        outs.set(`${s.tap}:${Math.round(x)}`, { x, colour: tint(s.tap, n) });
      }
      const contacts = l.contacts.map((c, k) => ({ ...c, colour: tint(k, n) }));
      return { id: l.table, pill: l.pill, hub: l.hub, ports: l.ports, contacts, strands, outs: [...outs].map(([k, o]) => ({ k, ...o })) };
    }),
  );
</script>

<svg class="looms" aria-hidden="true">
  {#each drawn as l (l.id)}
    {@const h = l.pill.y1 - l.pill.y0}
    <rect class="pill" x={l.pill.x0} y={l.pill.y0} width={l.pill.x1 - l.pill.x0} height={h} rx={h / 2} />
    <!-- (the ports' connectors into the hub: the meter, the selection) -->
    <path class="connector meter" d="M{l.ports.meter.x},{l.ports.meter.y} L{l.hub.x},{l.hub.y}" />
    <path class="connector" d="M{l.ports.select.x},{l.ports.select.y} L{l.hub.x},{l.hub.y}" />
    {#each l.contacts as c, k (k)}
      <path class="arm" d="M{l.hub.x},{l.hub.y} L{c.x},{c.y}" style:--trace={c.colour} />
    {/each}
    {#each l.strands as s (s.id)}
      <path class="strand" d={s.d} style:--trace={s.colour} />
    {/each}
    <circle class="hub" cx={l.hub.x} cy={l.hub.y} r="13" />
    {#each l.contacts as c, k (k)}
      <circle class="contact" cx={c.x} cy={c.y} r="7" style:fill={c.colour} />
    {/each}
    <circle class="port meter" cx={l.ports.meter.x} cy={l.ports.meter.y} r="5" />
    <circle class="port" cx={l.ports.select.x} cy={l.ports.select.y} r="5" />
    {#each l.outs as o (o.k)}
      <circle class="out" cx={o.x} cy={l.pill.y0} r="6" style:fill={o.colour} />
    {/each}
  {/each}
</svg>

<style>
  .looms {
    position: absolute;
    left: 0;
    top: 0;
    width: 1px;
    height: 1px;
    overflow: visible;
    pointer-events: none;
  }
  .pill {
    fill: var(--wheel-disc);
    stroke: var(--wheel-tick);
    stroke-width: 1.5;
  }
  path {
    fill: none;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  /* (a meter's trace, as MeterEdge draws one: edges.css .meter-trace) */
  .strand {
    stroke: var(--trace);
    stroke-width: var(--edge-trace-w);
    stroke-opacity: var(--edge-trace-rest);
  }
  .arm {
    stroke: var(--trace);
    stroke-width: 2;
    stroke-opacity: 0.7;
  }
  .connector {
    stroke: var(--wheel-tick);
    stroke-width: 2;
  }
  .connector.meter {
    stroke: var(--meter-0);
  }
  .hub {
    fill: var(--wheel-disc);
    stroke: var(--wheel-tick);
    stroke-width: 2;
  }
  .contact,
  .out {
    stroke: var(--wheel-disc);
    stroke-width: 2;
  }
  .port {
    fill: var(--wheel-tick);
    stroke: var(--wheel-disc);
    stroke-width: 2;
  }
  .port.meter {
    fill: var(--meter-0);
  }
</style>
