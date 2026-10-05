<script lang="ts">
  /**
   * The facts about a cell, below its picture — more than the graph can show:
   * its timing, the tables it reads down to its grid, its range, what plays it
   * (or what it plays), and for a mix every term in it.
   */
  import { codeShifts, resolvePitch, semitones, tableChain, type CompileResult } from '../engine/compile';
  import { flatten } from '../engine/realize';
  import { noteName } from '../theory/modes';
  import { isSelector, voiceBase } from '../layout/show';

  let { result, name, compact = false }: { result: CompileResult; name: string; compact?: boolean } = $props();
  // (compact: inside the sheet's "More", under its Connections — no heading, no relations twice)
  const RELATIONS = new Set(['plays on', 'played by', 'in', 'used by', 'steps', 'clock']);
  const cell = $derived(result.cells.get(name));
  const fmt = (x: number, d = 2) => String(+x.toFixed(d));

  /** Does output o play this cell (directly, or as a part or table of what it plays)? */
  const plays = (cellName: string, seen = new Set<string>()): boolean => {
    if (cellName === name) return true;
    if (seen.has(cellName)) return false;
    seen.add(cellName);
    const c = result.cells.get(cellName);
    return !!c && ((!!c.over && plays(c.over, seen)) || c.units.some((u) => u.atom.kind === 'ref' && plays(u.atom.name, seen)));
  };

  const facts = $derived.by(() => {
    const out: [string, string][] = [];
    const c = cell;
    if (!c) return out;
    // timing
    const clock = c.clock ? result.clocks.get(c.clock) : null;
    if (clock && !c.voice && !c.sink) {
      const perSecond = clock.perSecond * c.rate;
      const pass = c.steps / perSecond;
      out.push(['timing', `${c.steps} step${c.steps === 1 ? '' : 's'} · ${fmt(perSecond)} a second · a pass ${fmt(pass)} s`]);
      // a step, in seconds — and against its driver's: ½ of &bar's, three of &bar's …
      const drv = c.step ? result.cells.get(c.step.driver) : undefined;
      const rel = drv && drv.rate > 0 ? drv.rate / c.rate : null;
      const frac = (x: number) => {
        for (const d of [1, 2, 3, 4, 6, 8, 12, 16]) {
          const n = x * d;
          if (Math.abs(n - Math.round(n)) < 1e-6) return d === 1 ? String(Math.round(n)) : `${Math.round(n)}/${d}`;
        }
        return fmt(x, 3);
      };
      out.push(['a step', `${fmt(1 / perSecond, 3)} s${rel !== null ? `, ${frac(rel)} of &${c.step!.driver}'s step` : ''}`]);
      if (c.clock !== name) out.push(['clock', `&${c.clock}${c.step && c.step.driver !== c.clock ? ` (stepped by &${c.step.driver})` : ''}`]);
    }
    // an uneven meter: each beat against an even one
    if (c.scan && result.clocks.get(name)?.positional && new Set(c.scan.steps).size > 1) {
      const mean = c.scan.steps.reduce((a, b) => a + b, 0) / c.scan.steps.length;
      out.push(['beats', `${c.scan.steps.map((x) => fmt(x / mean)).join(' ')} of an even beat`]);
    }
    if (c.voice) out.push(['pitch 0', `${fmt(c.freq)} Hz · ${noteName(c.freq)}`]);
    // tables, down to the grid
    if (c.over) {
      // (scale(t, p) is shorthand: show it as written, not the cells it stands for)
      const shown: string[] = [];
      for (const t of tableChain(result, c.over)) {
        const sc = /^scale:(-?\d+):(\d+)$/.exec(t);
        if (sc) shown.push(`scale(${sc[1]},${sc[2]})`);
        else if (!/^key:/.test(t)) shown.push(`&${t}`);
      }
      out.push(['reads', shown.join(' → ')]);
    }
    // range of what it plays, as notes on its voice (melodies only: a meter's beats or a selector's picks aren't pitches)
    if (!c.voice && !c.root && !c.mix && !c.sink && !c.note && !result.clocks.get(name)?.positional && !isSelector(result, name)) {
      try {
        const shifts = codeShifts(result);
        const base = voiceBase(result, name);
        const pitches = flatten(result, name, shifts, null, undefined, 0, c.context).map((e) => {
          const r = resolvePitch(result, name, e.value, e.alter, shifts);
          return semitones(result, r.root, r.position);
        });
        if (pitches.length) {
          const lo = Math.min(...pitches);
          const hi = Math.max(...pitches);
          out.push(['range', `${noteName(base * 2 ** (lo / 12))} – ${noteName(base * 2 ** (hi / 12))} · ${fmt(hi - lo, 1)} semitones`]);
        }
      } catch {
        /* not resolvable */
      }
    }
    // who plays it / what it plays
    if (c.voice) {
      const by = result.outputs.filter((o) => o.voice === name);
      if (by.length) out.push(['played by', [...new Set(by.map((o) => `&${o.cell}`))].join(', ')]);
      const mixes = [...new Set(by.flatMap((o) => o.parts.map((p) => p.mix)))];
      if (mixes.length) out.push(['in', mixes.map((m) => `&${m}`).join(', ')]);
      if (by[0]?.envelope) {
        const e = by[0].envelope;
        out.push(['envelope', `attack ${e.attack} s · decay ${e.decay} s · sustain ${e.sustain} · release ${e.release} s`]);
      }
    } else if (!c.mix && !c.sink) {
      const voices = [...new Set(result.outputs.filter((o) => !o.kit && plays(o.cell)).map((o) => `&${o.voice}`))];
      if (voices.length) out.push(['plays on', voices.join(', ')]);
    }
    // what uses it
    const users = [...result.cells.values()].filter((x) => x.name !== name && !x.implicit && (x.over === name || x.units.some((u) => u.atom.kind === 'ref' && u.atom.name === name)));
    if (users.length) out.push(['used by', users.map((u) => (u.lambda ? '&(…)' : `&${u.name}`)).join(', ')]);
    const driven = [...result.cells.values()].filter((x) => x.step?.driver === name);
    if (driven.length) out.push(['steps', driven.map((d) => (d.lambda ? '&(…)' : `&${d.name}`)).join(', ')]);
    return compact ? out.filter(([k]) => !RELATIONS.has(k)) : out;
  });

  // a mix (or the sound card holding one): every term in it
  const terms = $derived.by(() => {
    const c = cell;
    if (!c || (!c.mix && !c.sink)) return [];
    return result.outputs
      .filter((o) => o.parts.some((p) => p.mix === name || p.sink === name) || o.through.includes(name))
      .map((o) => {
        const pitch = [`&${o.cell}${o.pick ? '[…]' : ''}`, ...o.mods.map((m) => `${m.sign > 0 ? '+' : '−'} &${m.cell.startsWith('λ') ? '(…)' : m.cell}`)].join(' ');
        const offset = o.offset ? ` ${o.offset > 0 ? '+' : '−'} ${Math.abs(o.offset)}` : '';
        const vols = o.levels.map((l) => `× &${l.cell.startsWith('λ') ? '(…)' : l.cell}`).join(' ');
        const voice = o.through.length ? `&${o.through[0]} (&${o.voice})` : `&${o.voice}`;
        return { pitch: pitch + offset, vols, voice, l: fmt(o.gains[0]), r: fmt(o.gains[1]) };
      });
  });
</script>

{#if facts.length || terms.length}
  <section class="facts" aria-label="details">
    {#if !compact}<h3>Details</h3>{/if}
    <dl>
      {#each facts as [k, v]}
        <dt>{k}</dt>
        <dd>{v}</dd>
      {/each}
    </dl>
    {#if terms.length}
      <table>
        <thead><tr><th>plays</th><th>through</th><th>L</th><th>R</th></tr></thead>
        <tbody>
          {#each terms as t}
            <tr>
              <td>{t.pitch}{#if t.vols}<span class="vols"> {t.vols}</span>{/if}</td>
              <td>{t.voice}</td>
              <td class="num">{t.l}</td>
              <td class="num">{t.r}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>
{/if}

<style>
  .facts {
    margin-top: 2px;
  }
  h3 {
    margin: 0 0 6px;
    font: 600 12px var(--font-ui);
    color: var(--text-muted);

  }
  dl {
    display: grid;
    grid-template-columns: 6.5em 1fr;
    gap: 4px 10px;
    margin: 0;
    font-size: 13px;
  }
  dt {
    color: var(--text-muted);
  }
  dd {
    margin: 0;
    font-family: var(--font-code);
    color: var(--text);
    word-break: break-word;
  }
  table {
    width: 100%;
    margin-top: 10px;
    border-collapse: collapse;
    font: 500 12.5px var(--font-code);
  }
  th {
    text-align: left;
    font: 600 11px var(--font-ui);
    color: var(--text-muted);
    padding: 4px 6px;
    border-bottom: 1px solid var(--line);
  }
  td {
    padding: 5px 6px;
    border-bottom: 1px solid color-mix(in oklab, var(--line) 50%, transparent);
    vertical-align: top;
  }
  .num {
    text-align: right;
    width: 3em;
  }
  .vols {
    color: var(--text-muted);
  }
</style>
