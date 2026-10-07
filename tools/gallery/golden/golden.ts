/** The golden reference graph: one piece with every kind of wheel and edge, and where its cells sit (columns, rows: as an example's fixed layout). */
import source from './golden.cells?raw';
import layout from './layout.json';

export const golden = { source: source.replace(/\n$/, ''), layout: layout as unknown as Record<string, [number, number]> };
