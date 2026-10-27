// The library as the app lists it, for the tests: every example with its card's title, tags and tier, and the MIDI
// library (as ui/entries.ts lists it).
import { PRESETS } from '@yggi/cells/engine/presets';
import { pieceMeta } from '@yggi/cells/engine/parser/index';
import { canonicalTags, MIDI_FILE } from '@yggi/cells/engine/tags';
import { readdirSync, readFileSync } from 'node:fs';

export const entries = [
  ...Object.entries(PRESETS).map(([key, p]) => {
    const m = pieceMeta(p.file);
    return { id: `example:${key}`, title: m?.title ?? key, tags: canonicalTags(m?.tags ?? []), tier: m?.tier ?? null };
  }),
  ...readdirSync('node_modules/@yggi/cells/midi').flatMap((set) =>
    (JSON.parse(readFileSync(`node_modules/@yggi/cells/midi/${set}/index.json`, 'utf8')) as { key: string; title: string }[]).map((m) => ({
      id: `midi:${m.key}`,
      title: m.title,
      tags: [set, MIDI_FILE, 'artist:Bach', 'genre:classical'],
      tier: null,
      collection: set,
    })),
  ),
];
