/**
 * The wheels' contact sheet, set up directly (`node tools/wheels.mjs --fast`): every kind of wheel the examples
 * have, mounted as the graph mounts it, at several sizes, in the live state of a moment (`liveAt`) with a
 * made-up sound. No piece is played, no layout settles: it opens in a second. Served by vite (`/tools/wheels/harness.html`).
 * URL: ?t=3 (seconds into each piece), ?only=word,word (pieces whose key or title has one).
 */
import { mount } from 'svelte';
import Harness from './Harness.svelte';
import '../../src/app.css';

export default mount(Harness, { target: document.getElementById('app')! });
