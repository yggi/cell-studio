/**
 * A cell in words: one sentence that says what it is and does, with the cells
 * it mentions as links; and its connections, grouped by how they relate.
 * For the detail view (the sheet): read at a glance, every cell one tap away.
 */
import { adsrOf, codeShifts, entries, resolvePitch, semitones, type CompileResult } from '../engine/compile';
import { modeName, mod, noteName } from '../theory/modes';
import { isSelector, kindOf } from './show';
import { lfoValues } from './cellview';

/** A piece of the summary: words, or a cell to link to. */
export type Bit = string | { readonly ref: string };

export interface Connection {
  /** How they relate, in plain words: "reads", "stepped by", "used by" … */
  readonly relation: string;
  readonly cells: readonly string[];
}

const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const uniq = (xs: readonly (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** "&a", "&a and &b", "&a, &b and &c" — as bits. */
function list(cells: readonly string[], max = 3): Bit[] {
  const shown = cells.slice(0, max);
  const out: Bit[] = [];
  shown.forEach((c, i) => {
    if (i > 0) out.push(i === shown.length - 1 && cells.length <= max ? ' and ' : ', ');
    out.push({ ref: c });
  });
  if (cells.length > max) out.push(` and ${cells.length - max} more`);
  return out;
}

/** Everything a cell connects to, by relation (only relations that have cells). */
export function connections(result: CompileResult, name: string): Connection[] {
  const c = result.cells.get(name);
  if (!c) return [];
  const named = (n: string) => !!result.cells.get(n) && !result.cells.get(n)!.implicit;
  const all = [...result.cells.values()];
  const plays = (cell: string, seen = new Set<string>()): boolean => {
    if (cell === name) return true;
    if (seen.has(cell)) return false;
    seen.add(cell);
    const x = result.cells.get(cell);
    return !!x && ((!!x.over && plays(x.over, seen)) || x.units.some((u) => u.atom.kind === 'ref' && plays(u.atom.name, seen)));
  };
  const out: Connection[] = [
    { relation: 'reads', cells: uniq([c.over]).filter(named) },
    { relation: 'stepped by', cells: uniq([c.step?.driver]).filter(named) },
    { relation: 'made of', cells: uniq(c.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : []))).filter(named) },
    {
      relation: 'plays on',
      cells: c.voice || c.mix || c.sink ? [] : uniq(result.outputs.filter((o) => !o.kit && plays(o.cell)).map((o) => o.voice)),
    },
    { relation: 'played by', cells: c.voice ? uniq(result.outputs.filter((o) => o.voice === name).map((o) => o.cell)) : [] },
    {
      relation: 'shaped by',
      cells: c.voice ? uniq([c.env, c.pitch, ...Object.values(c.paramCells ?? {}).flatMap((p) => p.factors)]).filter((n) => !!result.cells.get(n)) : [],
    },
    {
      relation: 'goes to',
      cells: c.voice
        ? uniq(result.outputs.filter((o) => o.voice === name).flatMap((o) => o.parts.map((p) => p.mix)))
        : c.mix && !c.sink
          ? uniq(all.filter((x) => x.sink && x.units.some((u) => u.atom.kind === 'ref' && u.atom.name === name)).map((x) => x.name))
          : [],
    },
    { relation: 'picks', cells: isSelector(result, name) ? uniq(result.cells.get(c.over!)!.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : []))) : [] },
    {
      // what it moves: voices whose parameters, pitch or envelope it drives; voices whose notes it bends or shapes
      relation: 'moves',
      cells: uniq([
        ...all.filter((x) => x.voice && (x.env === name || x.pitch === name || Object.values(x.paramCells ?? {}).some((p) => p.factors.includes(name)))).map((x) => x.name),
        ...result.outputs.filter((o) => o.mods.some((m) => m.cell === name) || o.levels.some((l) => l.cell === name)).map((o) => o.voice),
      ]),
    },
    { relation: 'steps', cells: uniq(all.filter((x) => x.step?.driver === name).map((x) => x.name)).filter(named) },
    {
      relation: 'used by',
      cells: uniq(all.filter((x) => x.name !== name && (x.over === name || x.units.some((u) => u.atom.kind === 'ref' && u.atom.name === name))).map((x) => x.name)),
    },
  ];
  return out.filter((x) => x.cells.length > 0);
}

/** One sentence: what the cell is and does. */
export function summary(result: CompileResult, name: string): Bit[] {
  const c = result.cells.get(name);
  if (!c || c.note) return [];
  const conn = Object.fromEntries(connections(result, name).map((x) => [x.relation, x.cells]));
  const kind = kindOf(result, name);
  const clock = c.clock ? result.clocks.get(c.clock) : null;
  const perMinute = clock ? Math.round((clock.perSecond * c.rate * 60) / (c.clock === name ? c.beat : 1)) : null;
  const tail = (rel: string, words: string, max = 3): Bit[] => (conn[rel]?.length ? [words, ...list(conn[rel], max)] : []);
  // what it reads: a named table (a link), or the scale(t, p) shorthand (as written)
  const through = (words: string): Bit[] => {
    if (conn['reads']?.length) return tail('reads', words);
    const sc = /^scale:(-?\d+):(\d+)$/.exec(c.over ?? '');
    return sc ? [`${words}scale(${sc[1]},${sc[2]})`] : [];
  };
  switch (kind) {
    case 'voice': {
      const src = c.params.s ? `A ${String(c.params.s)} voice` : 'A voice shaped by its braid';
      return [`${src} at ${noteName(c.freq)}`, ...tail('played by', ', played by '), '.'];
    }
    case 'mix':
      return [
        c.sink ? `The sound card: ${c.units.length === 1 ? 'one channel' : 'left and right'}` : `Mixes ${plural(c.mix?.length ?? 0, 'sound')}`,
        ...tail('goes to', ', into '),
        '.',
      ];
    case 'grid': {
      const period = c.map?.kind === 'edo' ? c.map.period : 2;
      return [`A grid of ${c.cycle} equal steps to ${period === 2 ? 'the octave' : `the ratio ${+period.toFixed(3)}`}`, ...tail('used by', ', read by '), '.'];
    }
    case 'meter': {
      // (written as levels, meter(…): its beats are its * and +, its steps finer)
      const leveled = c.leveled;
      const beats = leveled ? c.units.filter((u) => u.atom.kind === 'note' && u.atom.value <= 1).length : (c.scan?.steps.length ?? c.units.length);
      const even = !c.scan || new Set(c.scan.steps).size === 1;
      const finer = leveled && c.beat > 1 ? `, ${+c.beat.toFixed(2)} steps a beat` : '';
      return [`A meter of ${plural(beats, even ? 'beat' : 'uneven beat')}${perMinute ? `, ${perMinute} a minute` : ''}${finer}`, ...tail('steps', ', stepping '), '.'];
    }
    case 'adsr': {
      const e = adsrOf(c);
      return [
        e ? `An envelope: in over ${e.attack} s, down to ${e.sustain} over ${e.decay} s, out over ${e.release} s` : 'An envelope',
        ...tail('used by', ', shaping '),
        '.',
      ];
    }
    case 'lfo': {
      const v = lfoValues(result, name, codeShifts(result));
      const every = v?.rate.endsWith('Hz') ? `${v.rate.replace(' Hz', '')} times a second` : `every ${v?.rate}`;
      return [`Oscillates ${every}, ${v?.swing.startsWith('±') ? `swinging ${v.swing}` : `between ${v?.swing.replace('–', ' and ')}`}`, ...tail('moves', ', moving '), '.'];
    }
    case 'selector':
      return [`Arranges ${plural(conn['picks']?.length ?? 0, 'part')} over ${plural(c.steps, 'section')}${c.laps ? `, ${c.laps === 1 ? 'once' : `${c.laps} times`}` : ''}`, '.'];
    case 'table': {
      let what = `A table of ${plural(c.units.length, 'entry', 'entries')}`;
      try {
        const shifts = codeShifts(result);
        const ps = entries(result, name, shifts(name)).map((e) => {
          const r = resolvePitch(result, name, e.value, e.alter, shifts);
          return semitones(result, r.root, r.position);
        });
        const m = modeName(ps);
        if (m) what = `${m} on ${NOTE[mod(Math.round(ps[0]), 12)]}, a scale of ${plural(ps.length, 'note')}`;
        else if (ps.length === 12) what = `A key: ${NOTE[mod(Math.round(ps[0]), 12)]}`;
      } catch {
        /* a plain table */
      }
      return [what, ...tail('reads', ', over '), ...tail('used by', ', read by '), '.'];
    }
    case 'volume':
      return [`A volume of ${plural(c.units.length, 'step')}`, ...tail('stepped by', ', stepped by '), ...tail('used by', ', in '), '.'];
    default: {
      const played = !!conn['plays on']?.length;
      return [
        played ? `Plays ${plural(c.steps, 'step')}` : `A phrase of ${plural(c.steps, 'step')}`,
        ...through(' through '),
        ...tail('stepped by', ', stepped by '),
        ...(played ? tail('plays on', ', on ') : tail('used by', ', in ')),
        '.',
      ];
    }
  }
}
