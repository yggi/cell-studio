<script lang="ts">
  /**
   * The legend: the piece's values 0 … 12, each as the graph shows it — its colour, the value, its name
   * under the card's show= (notes, do, degrees, midi), its solfège (movable do: do the tonic), its
   * frequency, and its agogic mark (a meter's levels: * the bar, + a beat, . a subdivision, , finer).
   */
  import type { CompileResult, Shifts } from '../engine/program';
  import { period, positionHue, positionOctave, resolvePitch, semitones } from '../engine/helix';
  import { pieceMeta } from '../engine/parser';
  import { noteFrame, noteLabel, type Show } from '../layout/show';
  import { noteColour } from './theme';

  let { program, shifts, source }: { program: CompileResult; shifts: Shifts; source: string } = $props();

  // the piece's main grid: what its first melody plays through
  const main = $derived(program.outputs.find((o) => !o.kit && !o.tape)?.cell ?? null);
  const card = $derived(pieceMeta(source)?.cell ?? null);
  const shown = $derived.by(() => {
    const s = (card && program.cells.get(card)?.show) || 'notes';
    const [show, conv = ''] = s.split(':');
    return { show: (['notes', 'do', 'degrees', 'midi'].includes(show) ? show : 'notes') as Show, conv };
  });
  const MARK = ['*', '+', '-', '.', ','];
  const rows = $derived.by(() => {
    if (!main) return [];
    const { base, tonic } = noteFrame(program, main);
    return Array.from({ length: 13 }, (_, v) => {
      const r = resolvePitch(program, main, v, 0, shifts);
      const semis = semitones(program, r.root, r.position);
      const n = { semis, value: v, alter: 0, lap: period(program, r.root) };
      return {
        v,
        colour: noteColour(positionHue(program, r.root, r.position), false, positionOctave(program, r.root, r.position)),
        name: noteLabel(shown.show, n, base, tonic, shown.conv) ?? '',
        solfa: noteLabel('do', n, base, tonic) ?? '',
        hz: base * Math.pow(2, semis / 12),
        mark: MARK[v] ?? '',
      };
    });
  });
</script>

{#if rows.length}
  <div class="legend" role="table" aria-label="Legend: values, names, frequencies">
    {#each rows as r (r.v)}
      <div class="row" role="row">
        <span class="sw" style:background={r.colour} aria-hidden="true"></span>
        <span class="v">{r.v}</span>
        <span class="nm">{r.name}</span>
        <span class="sf">{r.solfa}</span>
        <span class="hz">{r.hz.toFixed(2)} Hz</span>
        <span class="mk" title="agogic level">{r.mark}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .legend {
    display: grid;
    gap: 2px;
    padding: 8px 10px;
    border-radius: 12px;
    background: color-mix(in oklab, var(--surface) 92%, transparent);
    border: 1px solid var(--line);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.4);
    font: 600 11px var(--font-code);
    color: var(--text);
    max-height: 60svh;
    overflow: auto;
  }
  .row {
    display: grid;
    grid-template-columns: 14px 2.2em 3.6em 2.6em 6.5em 1em;
    align-items: center;
    gap: 6px;
  }
  .sw {
    width: 14px;
    height: 14px;
    border-radius: 4px;
  }
  .v {
    text-align: right;
    color: var(--text-muted);
  }
  .sf {
    color: var(--text-muted);
    text-transform: capitalize;
  }
  .hz {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .mk {
    color: var(--accent);
    text-align: center;
  }
</style>
