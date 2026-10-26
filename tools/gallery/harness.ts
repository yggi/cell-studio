/**
 * The gallery's harness page (`node tools/gallery.mjs <subject>`): a sheet of one subject, set up directly — no piece is
 * played, no layout settles, so it opens in a second. Served by vite (`/tools/gallery/harness.html?subject=edges`).
 * URL: ?subject=wheels|edges|edge-mockups|golden|zoom|mockups|roll|keys|labels|uses, ?t=3 (seconds into each piece), ?only=word,word (pieces whose key or title has one).
 */
import { mount } from 'svelte';
import Edges from './edges/Sheet.svelte';
import EdgeMockups from './edgemocks/Sheet.svelte';
import Golden from './golden/Sheet.svelte';
import Keys from './keys/Sheet.svelte';
import Labels from './labels/Sheet.svelte';
import Mockups from './wheels/Mockups.svelte';
import Roll from './roll/Sheet.svelte';
import Uses from './uses/Sheet.svelte';
import Wheels from './wheels/Harness.svelte';
import '../../src/app.css';

// (zoom: the golden sheet's real Graph, each frame then zoomed in on its cells by fast.mjs)
const sheets = { wheels: Wheels, edges: Edges, 'edge-mockups': EdgeMockups, golden: Golden, zoom: Golden, mockups: Mockups, roll: Roll, keys: Keys, labels: Labels, uses: Uses };
const subject = new URLSearchParams(location.search).get('subject') ?? 'wheels';
export default mount(sheets[subject as keyof typeof sheets] ?? Wheels, { target: document.getElementById('app')! });
