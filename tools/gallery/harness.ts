/**
 * The gallery's harness page (`node tools/gallery.mjs <subject>`): a sheet of one subject, set up directly — no piece is
 * played, no layout settles, so it opens in a second. Served by vite (`/tools/gallery/harness.html?subject=edges`).
 * URL: ?subject=wheels|edges|mockups, ?t=3 (seconds into each piece), ?only=word,word (pieces whose key or title has one).
 */
import { mount } from 'svelte';
import Edges from './edges/Sheet.svelte';
import Mockups from './wheels/Mockups.svelte';
import Wheels from './wheels/Harness.svelte';
import '../../src/app.css';

const sheets = { wheels: Wheels, edges: Edges, mockups: Mockups };
const subject = new URLSearchParams(location.search).get('subject') ?? 'wheels';
export default mount(sheets[subject as keyof typeof sheets] ?? Wheels, { target: document.getElementById('app')! });
