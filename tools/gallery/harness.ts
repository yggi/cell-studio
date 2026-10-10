/**
 * The gallery's harness page (`node tools/gallery.mjs <subject>`): a sheet of one subject, set up directly — no piece is
 * played, no layout settles, so it opens in a second. Served by vite (`/tools/gallery/harness.html?subject=edges`).
 * URL: ?subject=wheels|edges|golden|zoom|mockups|roll, ?t=3 (seconds into each piece), ?only=word,word (pieces whose key or title has one).
 */
import { mount } from 'svelte';
import Edges from './edges/Sheet.svelte';
import Golden from './golden/Sheet.svelte';
import Mockups from './wheels/Mockups.svelte';
import Roll from './roll/Sheet.svelte';
import Wheels from './wheels/Harness.svelte';
import '../../src/app.css';

// (zoom: the golden sheet's real Graph, each frame then zoomed in on its cells by fast.mjs)
const sheets = { wheels: Wheels, edges: Edges, golden: Golden, zoom: Golden, mockups: Mockups, roll: Roll };
const subject = new URLSearchParams(location.search).get('subject') ?? 'wheels';
export default mount(sheets[subject as keyof typeof sheets] ?? Wheels, { target: document.getElementById('app')! });
