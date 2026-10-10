// The gallery: mock up what the graph draws, and take pictures of it (contact sheets, design mock-ups).
// One tool, one subject at a time; the `gallery` skill (.claude/skills/gallery/SKILL.md) says how to read the pictures.
//
//   node tools/gallery.mjs wheels [--fast] [secs] [pieces…]   every kind of wheel (--fast: set up directly, no build)
//   node tools/gallery.mjs edges [secs] [pieces…]             every kind of edge in every state, on bare nodes
//   node tools/gallery.mjs golden                            the golden graph: every wheel and edge, in one real graph
//   node tools/gallery.mjs mockups                            the wheel design questions (#107)
//   node tools/gallery.mjs roll [secs]                        a cell's piano roll in each state (#211)
//   node tools/gallery.mjs graphs                             every example's graph as the library's miniature (tools/graphs.mjs)
//
// `wheels` plays every piece in the built app (npm run build first) unless --fast; the others are always set up
// directly (tools/gallery/fast.mjs, from the working tree). A new subject: a folder in tools/gallery/ with a Sheet
// component, and a line in tools/gallery/harness.ts.
const [subject, ...args] = process.argv.slice(2);
const SUBJECTS = ['wheels', 'edges', 'golden', 'mockups', 'roll', 'graphs'];
if (!SUBJECTS.includes(subject)) {
  console.error(`usage: node tools/gallery.mjs <${SUBJECTS.join('|')}> [--fast] [secs] [pieces…]`);
  process.exit(2);
}
if (subject === 'graphs') {
  await import('./graphs.mjs');
  process.exit(0);
}
const fast = args.includes('--fast') || subject !== 'wheels';
process.argv = [process.argv[0], process.argv[1], ...args.filter((a) => a !== '--fast')];
if (fast) process.env.GALLERY_SUBJECT = subject;
await import(fast ? './gallery/fast.mjs' : './gallery/real.mjs');
