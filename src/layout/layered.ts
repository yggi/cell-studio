/**
 * A layered drawing, the textbook way (Sugiyama): no forces, no pins.
 *
 *  1. Rows: each cell's height in the signal path (flowRanks: the sound card on
 *     top, voices, melodies, their parts and tables, the meter at the bottom).
 *  2. Long edges get a waypoint on each row they cross, so they take part in
 *     the ordering instead of slicing through it.
 *  3. Order within each row: sweeps up and down, each node to the weighted mean
 *     place of its neighbours (the barycentre), then neighbours swapped wherever
 *     that crosses fewer edges; the best order found is kept. An edge to the
 *     meter weighs a quarter: it says when, not what — time isn't structure.
 *  4. Places: each node towards the mean of its neighbours, kept in order and
 *     apart by its width — columns appear where they're natural.
 */
import type { GraphModel } from '../engine/graph';
import { columns, flowRanks } from './physics';

export interface LayeredOptions {
  /** Room between rows, per rank. */
  readonly gapY: number;
  /** Room between neighbours in a row, beyond their own widths. */
  readonly gapX: number;
  /** A node's radius (its width is twice this). */
  readonly radius: (id: string) => number;
}

type V = { id: string; layer: number; dummy: boolean; w: number };

export function layered(model: GraphModel, o: LayeredOptions): Map<string, { x: number; y: number }> {
  const nodes = model.nodes.filter((n) => !(n as { petalOf?: string }).petalOf);
  const ids = new Set(nodes.map((n) => n.id));
  const rank = flowRanks({ nodes, edges: model.edges.filter((e) => ids.has(e.source) && ids.has(e.target)) });
  // rows: the distinct ranks, top (sound) first; y keeps half-ranks half a row apart
  const ranksDesc = [...new Set(nodes.map((n) => rank.get(n.id) ?? 0))].sort((a, b) => b - a);
  const layerOf = new Map(ranksDesc.map((r, i) => [r, i]));
  const vs = new Map<string, V>();
  for (const n of nodes) vs.set(n.id, { id: n.id, layer: layerOf.get(rank.get(n.id) ?? 0)!, dummy: false, w: 2 * o.radius(n.id) + o.gapX });
  // edges, between neighbouring rows: long ones through waypoints
  const links: { a: string; b: string; w: number }[] = [];
  const seen = new Set<string>();
  for (const e of model.edges) {
    if (!vs.has(e.source) || !vs.has(e.target) || e.source === e.target) continue;
    const key = [e.source, e.target].sort().join('→');
    if (seen.has(key)) continue;
    seen.add(key);
    // an edge into a meter says when, not what: no say in rows or order, no waypoints taking room
    // (the meter keeps its place by its rank; the edge is still drawn)
    const into = nodes.find((n) => n.id === e.target) as { isMeter?: boolean } | undefined;
    if (e.kind === 'step' && into?.isMeter) continue;
    const w = e.kind === 'step' ? 0.25 : 1;
    let [u, v] = [vs.get(e.source)!, vs.get(e.target)!];
    if (u.layer === v.layer) continue; // (same row: no say in the order)
    if (u.layer > v.layer) [u, v] = [v, u];
    let prev = u.id;
    for (let l = u.layer + 1; l < v.layer; l++) {
      const d = `·${e.id}·${l}`;
      vs.set(d, { id: d, layer: l, dummy: true, w: o.gapX * 0.6 });
      links.push({ a: prev, b: d, w });
      prev = d;
    }
    links.push({ a: prev, b: v.id, w });
  }
  const layers: string[][] = [];
  for (const v of vs.values()) (layers[v.layer] ??= []).push(v.id);
  for (let l = 0; l < layers.length; l++) layers[l] ??= [];
  const up = new Map<string, { id: string; w: number }[]>(); // neighbours in the row above
  const down = new Map<string, { id: string; w: number }[]>(); // … and below
  for (const { a, b, w } of links) {
    const [hi, lo] = vs.get(a)!.layer < vs.get(b)!.layer ? [a, b] : [b, a];
    (down.get(hi) ?? down.set(hi, []).get(hi)!).push({ id: lo, w });
    (up.get(lo) ?? up.set(lo, []).get(lo)!).push({ id: hi, w });
  }
  // a first order: voices by their stereo place (columns), the rest as they come
  const cols = columns(model);
  for (const row of layers) row.sort((a, b) => (cols.get(a) ?? 0) - (cols.get(b) ?? 0));
  const pos = new Map<string, number>();
  const index = () => layers.forEach((row) => row.forEach((id, i) => pos.set(id, i)));
  index();
  // crossings between two rows, weighted
  const crossings = (l: number) => {
    if (l + 1 >= layers.length) return 0;
    const es: [number, number, number][] = [];
    for (const id of layers[l]) for (const n of down.get(id) ?? []) es.push([pos.get(id)!, pos.get(n.id)!, n.w]);
    let c = 0;
    for (let i = 0; i < es.length; i++)
      for (let j = i + 1; j < es.length; j++) if ((es[i][0] - es[j][0]) * (es[i][1] - es[j][1]) < 0) c += es[i][2] * es[j][2];
    return c;
  };
  const total = () => layers.reduce((a, _, l) => a + crossings(l), 0);
  // tags inside the piece (tags= on cells): a tagged node leans towards where its tag's members are —
  // so clusters begin side by side, not scattered over every row
  const tagOf = new Map(nodes.flatMap((n) => {
    const c = (n as { cell?: { note?: boolean; tags?: readonly string[] } }).cell;
    return !c?.note && c?.tags?.length ? [[n.id, c.tags[0]] as const] : [];
  }));
  const tagCentre = (by: Map<string, number>) => {
    const sums = new Map<string, [number, number]>();
    for (const [id, t] of tagOf) {
      const v = by.get(id);
      if (v === undefined) continue;
      const a = sums.get(t) ?? [0, 0];
      sums.set(t, [a[0] + v, a[1] + 1]);
    }
    return new Map([...sums].map(([t, [sum, k]]) => [t, sum / k]));
  };
  // first, tags apart: each row begins with its tags in order of their names
  const tagNames = [...new Set(tagOf.values())].sort();
  if (tagNames.length) for (const row of layers) row.sort((a, b) => (tagOf.has(a) ? tagNames.indexOf(tagOf.get(a)!) : tagNames.length / 2) - (tagOf.has(b) ? tagNames.indexOf(tagOf.get(b)!) : tagNames.length / 2));
  const mean = (ns: { id: string; w: number }[] | undefined, fallback: number) => {
    if (!ns?.length) return fallback;
    const w = ns.reduce((a, n) => a + n.w, 0);
    return ns.reduce((a, n) => a + pos.get(n.id)! * n.w, 0) / w;
  };
  let best = layers.map((r) => [...r]);
  let bestCross = total();
  for (let sweep = 0; sweep < 24 && bestCross > 0; sweep++) {
    const downward = sweep % 2 === 0;
    const order = downward ? layers.map((_, l) => l) : layers.map((_, l) => layers.length - 1 - l);
    const tc = tagCentre(pos);
    for (const l of order) {
      const row = layers[l];
      const lean = (id: string, v: number) => (tagOf.has(id) ? 0.55 * v + 0.45 * tc.get(tagOf.get(id)!)! : v);
      const want = new Map(row.map((id) => [id, lean(id, mean(downward ? up.get(id) : down.get(id), pos.get(id)!))]));
      row.sort((a, b) => want.get(a)! - want.get(b)! || pos.get(a)! - pos.get(b)!);
      row.forEach((id, i) => pos.set(id, i));
    }
    // neighbours swapped wherever that crosses fewer edges (with both rows around)
    for (let l = 0; l < layers.length; l++) {
      const row = layers[l];
      for (let improved = true, guard = 0; improved && guard < 8; guard++) {
        improved = false;
        for (let i = 0; i + 1 < row.length; i++) {
          const before = (l ? crossings(l - 1) : 0) + crossings(l);
          [row[i], row[i + 1]] = [row[i + 1], row[i]];
          pos.set(row[i], i);
          pos.set(row[i + 1], i + 1);
          const after = (l ? crossings(l - 1) : 0) + crossings(l);
          if (after < before) improved = true;
          else {
            [row[i], row[i + 1]] = [row[i + 1], row[i]];
            pos.set(row[i], i);
            pos.set(row[i + 1], i + 1);
          }
        }
      }
    }
    const c = total();
    if (c < bestCross) {
      bestCross = c;
      best = layers.map((r) => [...r]);
    }
  }
  for (let l = 0; l < layers.length; l++) layers[l] = best[l];
  index();
  // crowded rows (past nine nodes): a cell's parts as a track — a column under it, two abreast —
  // or, where no cell has several (a row of strangers), alternate ones dropped half a row
  const MAX_ROW = 9;
  const parentOf = (id: string) => {
    const ups = up.get(id) ?? [];
    return ups.length ? ups.reduce((a, b) => (b.w > a.w ? b : a)).id : id;
  };
  const tracks = new Map<number, string[][]>(); // layer → its groups, in order
  const sub = new Map<string, number>();
  const subRows = layers.map((row, l) => {
    const real = row.filter((id) => !vs.get(id)!.dummy);
    if (real.length <= MAX_ROW) return 1;
    const groups: string[][] = [];
    for (const id of real) {
      const last = groups[groups.length - 1];
      if (last && parentOf(last[0]) === parentOf(id)) last.push(id);
      else groups.push([id]);
    }
    if (groups.some((g) => g.length > 1)) {
      tracks.set(l, groups);
      groups.forEach((g) => g.forEach((id, i) => sub.set(id, Math.floor(i / 2))));
      return Math.max(...groups.map((g) => Math.ceil(g.length / 2)));
    }
    const r = Math.min(3, Math.ceil(real.length / MAX_ROW));
    real.forEach((id, k) => {
      sub.set(id, k % r);
      const v = vs.get(id)!;
      vs.set(id, { ...v, w: v.w / r + (o.gapX * (r - 1)) / (2 * r) });
    });
    return r;
  });
  // places: rows packed by width, then each node towards its neighbours' mean, kept in order and apart
  const x = new Map<string, number>();
  for (const row of layers) {
    let at = 0;
    const xs = row.map((id) => {
      const w = vs.get(id)!.w;
      const c = at + w / 2;
      at += w;
      return c;
    });
    const shift = at / 2;
    row.forEach((id, i) => x.set(id, xs[i] - shift));
  }
  const nbrs = (id: string) => [...(up.get(id) ?? []), ...(down.get(id) ?? [])];
  for (let it = 0; it < 40; it++) {
    const tx = tagCentre(x);
    for (const row of it % 2 ? [...layers].reverse() : layers) {
      if (!row.length) continue;
      const want = row.map((id) => {
        const ns = nbrs(id);
        const v = ns.length ? ns.reduce((a, n) => a + x.get(n.id)! * n.w, 0) / ns.reduce((a, n) => a + n.w, 0) : x.get(id)!;
        // (and a slight pull to the middle: following neighbours alone, a wide start would stay wide —
        // the spacing below still keeps every node clear of the next)
        return 0.9 * (tagOf.has(id) ? 0.55 * v + 0.45 * tx.get(tagOf.get(id)!)! : v);
      });
      // kept in order, apart by their widths: forward, then backward, and the two met halfway
      const fwd = [...want];
      for (let k = 1; k < row.length; k++) fwd[k] = Math.max(fwd[k], fwd[k - 1] + (vs.get(row[k - 1])!.w + vs.get(row[k])!.w) / 2);
      const back = [...want];
      for (let k = row.length - 2; k >= 0; k--) back[k] = Math.min(back[k], back[k + 1] - (vs.get(row[k + 1])!.w + vs.get(row[k])!.w) / 2);
      const placed = fwd.map((f, k) => (f + back[k]) / 2);
      for (let k = 1; k < row.length; k++) placed[k] = Math.max(placed[k], placed[k - 1] + (vs.get(row[k - 1])!.w + vs.get(row[k])!.w) / 2);
      row.forEach((id, k) => x.set(id, placed[k]));
    }
  }
  // tracks: each group two abreast under where it wanted to be, the groups packed side by side
  for (const [, groups] of tracks) {
    const want = groups.map((g) => g.reduce((a, id) => a + x.get(id)!, 0) / g.length);
    const width = groups.map((g) => (g.length > 1 ? 2 : 1) * Math.max(...g.map((id) => vs.get(id)!.w)));
    const placed = [...want];
    for (let k = 1; k < placed.length; k++) placed[k] = Math.max(placed[k], placed[k - 1] + (width[k - 1] + width[k]) / 2);
    const drift = placed.reduce((a, v, k) => a + v - want[k], 0) / placed.length;
    groups.forEach((g, k) => {
      const w = width[k] / (g.length > 1 ? 2 : 1);
      g.forEach((id, i) => x.set(id, placed[k] - drift + (g.length > 1 ? ((i % 2) - 0.5) * w : 0)));
    });
  }
  // rows tightened: no gap wider than 1.6 times what its neighbours need (order and centre kept;
  // a track moves as one) — whatever drifted apart above comes back together here
  for (let l = 0; l < layers.length; l++) {
    const units: { ids: string[]; w: number }[] = tracks.has(l)
      ? tracks.get(l)!.map((g) => ({ ids: g, w: (g.length > 1 ? 2 : 1) * Math.max(...g.map((id) => vs.get(id)!.w)) }))
      : layers[l].filter((id) => !vs.get(id)!.dummy).map((id) => ({ ids: [id], w: vs.get(id)!.w }));
    if (units.length < 2) continue;
    const centre = (u: (typeof units)[number]) => u.ids.reduce((a, id) => a + x.get(id)!, 0) / u.ids.length;
    units.sort((a, b) => centre(a) - centre(b));
    const before = units.map(centre);
    const after = [...before];
    for (let k = 1; k < units.length; k++) {
      const need = (units[k - 1].w + units[k].w) / 2;
      after[k] = after[k - 1] + Math.min(before[k] - before[k - 1], need * 1.6);
    }
    const shift = before.reduce((a, v) => a + v, 0) / before.length - after.reduce((a, v) => a + v, 0) / after.length;
    units.forEach((u, k) => u.ids.forEach((id) => x.set(id, x.get(id)! + after[k] + shift - before[k])));
  }
  // centred; y by rank (half-ranks half a row)
  const real = nodes.map((n) => x.get(n.id)!);
  const mid = (Math.min(...real) + Math.max(...real)) / 2;
  // rows evenly spaced, one per distinct rank (half-ranks get a row of their own, not half of one);
  // a staggered row takes its sub-rows' room, half a row each
  const rowY: number[] = [];
  let yAt = 0;
  for (let l = 0; l < layers.length; l++) {
    rowY[l] = yAt;
    yAt += o.gapY * (1 + (subRows[l] - 1) * (tracks.has(l) ? 0.8 : 0.55));
  }
  const out = new Map(
    nodes.map((n) => {
      const v = vs.get(n.id)!;
      return [n.id, { x: x.get(n.id)! - mid, y: rowY[v.layer] + (sub.get(n.id) ?? 0) * o.gapY * (tracks.has(v.layer) ? 0.8 : 0.55) }];
    }),
  );
  // notes (a label alone: nothing to order them by) beside the top, to the right of everything
  const isNote = (n: (typeof nodes)[number]) => !!(n as { cell?: { note?: boolean } }).cell?.note;
  const notes = nodes.filter(isNote);
  if (notes.length) {
    const rest = nodes.filter((n) => !isNote(n)).map((n) => out.get(n.id)!.x + vs.get(n.id)!.w / 2);
    let at = (rest.length ? Math.max(...rest) : 0) + o.gapX;
    for (const n of notes) {
      const w = vs.get(n.id)!.w;
      out.set(n.id, { x: at + w / 2, y: 0 });
      at += w;
    }
  }
  return out;
}
