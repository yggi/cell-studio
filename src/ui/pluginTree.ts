/**
 * What a plugin's `draw` returns: a tree of SVG elements as plain data, never DOM. The host (PluginTree.svelte)
 * draws it from an allow-list of elements and attributes, so a drawing can only draw.
 */

/** An element, or a text. */
export type PNode = string | number | PElement;
export interface PElement {
  readonly t: string;
  readonly a: Readonly<Record<string, string | number>>;
  readonly c: readonly PNode[];
}

/** `h('circle', { cx: 10, cy: 10, r: 4 })`, `h('g', null, child, …)`: the element a plugin's draw builds. */
type Kid = PNode | null | false | readonly Kid[];
export function h(t: string, a?: Readonly<Record<string, string | number>> | null, ...c: Kid[]): PElement {
  return { t, a: a ?? {}, c: c.flat(Infinity as 1).filter((x): x is PNode => x !== null && x !== false) };
}

export const TAGS: ReadonlySet<string> = new Set([
  'g',
  'path',
  'circle',
  'ellipse',
  'line',
  'rect',
  'polygon',
  'polyline',
  'text',
  'tspan',
  'title',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
]);

/** An attribute that can only style or place a shape: not an event, not a link, not a script. */
export function allowedAttribute(name: string, value: string | number): boolean {
  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(name) || /^on/i.test(name) || /^(href|src|xlink|xmlns)/i.test(name)) return false;
  // (a gradient or clip by id is fine; any other url() is a fetch)
  return !/url\(\s*(?!#)|javascript:|expression\(|@import/i.test(String(value));
}

/** An element's attributes as the host draws them: the allowed ones, as text. */
export function attributesOf(e: PElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(e.a)) if ((typeof v === 'string' || typeof v === 'number') && allowedAttribute(k, v)) out[k] = String(v);
  return out;
}

/** The children of what draw returned (one node or a list). */
export const rootsOf = (r: PNode | readonly PNode[] | null | undefined): readonly PNode[] => (r == null ? [] : Array.isArray(r) ? r : [r as PNode]);
