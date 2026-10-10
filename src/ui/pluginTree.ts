/**
 * What a plugin's `draw` returns: a tree of SVG elements as plain data, never DOM. The host (PluginTree.svelte)
 * draws it from allow-lists of elements, attributes and values, which keeps what is drawn to shapes and paint. That is
 * not a sandbox: the code that made it runs with the page's powers (pluginTrust.svelte.ts).
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

/** The attributes a drawing may set: those that place or paint a shape. No events, links, classes, tab stops or ids but its own. */
const ATTRIBUTES: ReadonlySet<string> = new Set(
  (
    'cx cy r rx ry x y x1 y1 x2 y2 dx dy d points width height transform offset gradientUnits gradientTransform spreadMethod fx fy ' +
    'fill stroke stroke-width stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-opacity fill-opacity fill-rule clip-rule opacity ' +
    'stop-color stop-opacity text-anchor dominant-baseline font-size font-weight font-style font-family letter-spacing paint-order filter clip-path style id'
  ).split(' '),
);
/** The properties of a `style`: the same paint, no more. */
const STYLE: ReadonlySet<string> = new Set(
  (
    'fill stroke stroke-width stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-opacity fill-opacity opacity stop-color stop-opacity ' +
    'text-anchor dominant-baseline font font-size font-weight font-style font-family letter-spacing paint-order filter'
  ).split(' '),
);
/** The only functions a value may call (a reference is `url(#plugin…)`, one of the drawing's own ids). */
const FUNCTIONS: ReadonlySet<string> = new Set(['rgb', 'rgba', 'hsl', 'hsla', 'var', 'drop-shadow', 'translate', 'rotate', 'scale', 'matrix', 'url']);

/** A value that paints or places: no escapes, control characters, quotes or markup; parentheses that close; only the functions above; and every `url(` a closed reference to the drawing's own ids (an unterminated one is a fetch the closed-form check would never see). */
function plainValue(value: string): boolean {
  if (value.length > LIMITS.value) return false;
  // eslint-disable-next-line no-control-regex -- control characters are what this rejects
  if (/[\\"'<>{};@\u0000-\u001f]|\/\*/.test(value)) return false;
  let open = 0;
  for (const ch of value) {
    if (ch === '(') open++;
    else if (ch === ')' && --open < 0) return false;
  }
  if (open !== 0) return false;
  for (const m of value.matchAll(/([a-zA-Z-]+)\(/g)) if (!FUNCTIONS.has(m[1].toLowerCase())) return false;
  const urls = value.match(/url\(/gi) ?? [];
  const own = value.match(/url\(\s*#plugin[A-Za-z0-9_-]*\s*\)/gi) ?? [];
  return urls.length === own.length;
}

/** A `style` kept to its allowed properties and values (null when nothing is left). */
function plainStyle(style: string): string | null {
  const kept = style
    .split(';')
    .map((d) => d.split(/:(.*)/s))
    .filter(([prop, value]) => prop && value !== undefined && STYLE.has(prop.trim().toLowerCase()) && plainValue(value))
    .map(([prop, value]) => `${prop.trim().toLowerCase()}:${value.trim()}`);
  return kept.length ? kept.join(';') : null;
}

/** An attribute as the host draws it, or null: allowed by name, and by what it says. */
export function plainAttribute(name: string, value: string | number): string | null {
  if (!ATTRIBUTES.has(name)) return null;
  const text = String(value);
  // (the whole style is bounded like any value, before its declarations are read one by one)
  if (name === 'style') return text.length > LIMITS.value ? null : plainStyle(text);
  // (an id is the drawing's own: view.uid starts it, so it cannot be one of the app's)
  if (name === 'id') return /^plugin[A-Za-z0-9_-]*$/.test(text) ? text : null;
  return plainValue(text) ? text : null;
}

/** An element's attributes as the host draws them: the allowed ones, as text. */
export function attributesOf(e: PElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(e.a)) {
    const kept = typeof v === 'string' || typeof v === 'number' ? plainAttribute(k, v) : null;
    if (kept !== null) out[k] = kept;
  }
  return out;
}

/** What one drawing may be: so many elements and texts, so deep, so long a text or an attribute (a shared subtree is counted each time it appears). */
const LIMITS = { nodes: 2000, depth: 12, text: 400, attributes: 24, value: 2000 };

/**
 * What `draw` returned, as a copy of our own: only elements of the allowed tags with the allowed attributes (already
 * plain), texts as text, anything else dropped, and the size bounded. Throws when it is too large.
 */
export function boundedTree(returned: unknown): PNode[] {
  let nodes = 0;
  const copy = (n: unknown, depth: number): PNode | null => {
    if (typeof n === 'string') {
      if (++nodes > LIMITS.nodes) throw new Error(`the drawing has more than ${LIMITS.nodes} elements and texts`);
      return n.slice(0, LIMITS.text);
    }
    if (typeof n === 'number') return Number.isFinite(n) ? n : null;
    if (typeof n !== 'object' || n === null) return null;
    // (each field read once: a getter could answer differently the second time)
    const { t, a: attributes, c: children } = n as { t?: unknown; a?: unknown; c?: unknown };
    if (typeof t !== 'string' || !TAGS.has(t)) return null;
    if (++nodes > LIMITS.nodes) throw new Error(`the drawing has more than ${LIMITS.nodes} elements and texts`);
    if (depth > LIMITS.depth) throw new Error(`the drawing is nested deeper than ${LIMITS.depth}`);
    const attrs = typeof attributes === 'object' && attributes !== null ? Object.entries(attributes as Record<string, unknown>).slice(0, LIMITS.attributes) : [];
    const a = attributesOf({ t, a: Object.fromEntries(attrs.filter(([, v]) => typeof v === 'string' || typeof v === 'number')) as Record<string, string | number>, c: [] });
    const kids = Array.isArray(children) ? children.slice(0, LIMITS.nodes) : [];
    return { t, a, c: kids.flatMap((k) => copy(k, depth + 1) ?? []) };
  };
  const roots = Array.isArray(returned) ? returned.slice(0, LIMITS.nodes) : [returned];
  return roots.flatMap((r) => copy(r, 0) ?? []);
}
