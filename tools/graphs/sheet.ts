// The contact sheet of every example's graph (tools/graphs.mjs): each drawn from its miniature, as the library
// draws it (src/layout/miniature.ts: the layout run briefly, meters placed last), with the numbers the layout's
// baseline records for it (src/layout/quality.baseline.json: crossings, clusters). A page, rendered by the script.
import { readFileSync } from 'node:fs';
import { buildExamplesIndex } from '../examples-index';
import { miniShape } from '../../src/layout/miniature';
import { miniPaint } from '../../src/ui/theme';

/** The sheet as a page: `css` is app.css, linked (its theme paints the nodes). */
export function sheetHtml(css: string): string {
  const base = JSON.parse(readFileSync('src/layout/quality.baseline.json', 'utf8')) as Record<string, Record<string, number>>;
  const cards = buildExamplesIndex().map((e) => {
    if (!e.miniature) return '';
    const s = miniShape(e.miniature, false);
    const q = base[e.key] ?? {};
    const lines = s.edges.map((l) => `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke-width="${s.edge}"/>`).join('');
    const dots = s.nodes
      .map((n) => {
        const p = miniPaint(n.colour);
        return `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" style="fill:${p.ring ? 'var(--wheel-disc)' : p.fill};stroke:${p.ring ? p.fill : 'none'}" stroke-width="${p.ring ? n.r * 0.32 : 0}"/>`;
      })
      .join('');
    const crossings = `<i${q.crossings ? ' class="bad"' : ''}>${q.crossings ?? '?'} ×</i>`;
    const clusters = q.clusters || q.intruders ? ` · <i class="bad">${q.clusters} overlaps, ${q.intruders} intruders</i>` : '';
    return `<figure><svg viewBox="${s.box.join(' ')}">${lines}${dots}</svg><figcaption><b>${e.title}</b><span>${e.key} · ${e.size} cells · ${crossings}${clusters}</span></figcaption></figure>`;
  });
  return `<!doctype html><meta charset="utf-8"><title>Every graph</title><link rel="stylesheet" href="${css}"><style>
body{background:var(--bg);color:var(--text);font:13px var(--font-ui);margin:24px}h1{font-size:20px;margin:0 0 16px}
main{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}figure{margin:0;background:var(--surface);border-radius:10px;padding:8px}
svg{display:block;width:100%;aspect-ratio:4/3}line{stroke:var(--edge);stroke-opacity:.7}figcaption{display:flex;flex-direction:column;gap:2px;margin-top:4px}
figcaption span{color:var(--text-muted);font-size:11.5px}i{font-style:normal}i.bad{color:var(--warning)}</style>
<h1>Every example's graph, as the library draws it · crossings, overlapping clusters and intruders from the layout's baseline</h1><main>${cards.join('')}</main>`;
}
