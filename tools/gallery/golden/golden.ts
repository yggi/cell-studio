/** The golden reference graph: one piece, as the app reads it, with a value of every dimension the examples draw (facets.ts). */
import source from './golden.cells?raw';

export const golden = { source: source.replace(/\n$/, '') };
