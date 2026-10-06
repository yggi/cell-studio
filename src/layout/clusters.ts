/**
 * A cluster's wash: the disc behind the members of a tag, in the piece's graph (cells tagged alike)
 * and in the library's (pieces carrying a tag). Centred on its members, covering most of them —
 * not the furthest straggler.
 */
export function clusterDisc(members: readonly { x: number; y: number }[], pad: number, min: number): { x: number; y: number; r: number } {
  const x = members.reduce((a, m) => a + m.x, 0) / members.length;
  const y = members.reduce((a, m) => a + m.y, 0) / members.length;
  const ds = members.map((m) => Math.hypot(m.x - x, m.y - y)).sort((a, b) => a - b);
  return { x, y, r: Math.max(ds[Math.floor(ds.length * 0.8)] + pad, min) };
}
