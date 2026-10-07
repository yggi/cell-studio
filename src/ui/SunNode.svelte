<script lang="ts" module>
  // (each one's own ids for its gradients: the same cell can be drawn twice at once)
  let suns = 0;
</script>

<script lang="ts">
  /**
   * The sun: a day of 24 hours as the sky turns it — noon (S) at the top, midnight (N) at the bottom,
   * sunrise (E) on the left, sunset (W) on the right; the horizon through the middle. Round the rim, the
   * law's twelve blocks, each as bright as its mode. The sun stands where the piece is in its day.
   * Stopped, turning it moves where play starts.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { getGraphContext } from './context';
  import { polar, ringSegment } from '../layout/geometry';
  import { angleOf as turnOf, turnDelta } from '../layout/dial';
  import { NOTE_NAMES as NAMES } from '../theory/modes';
  import { blockColour } from './theme';
  import { BLOCK_NAMES, DAY_MODES, MODE_NAMES, place, SECONDS_PER_STEP } from '../engine/fiveto12';

  let { data }: NodeProps = $props();
  const d = $derived(data as { name: string });
  const ctx = getGraphContext();
  const S = 220;
  const sky = `sky${++suns}`;
  const R = S / 2;
  const cell = $derived(ctx.program.cells.get(d.name));
  // a day meter (show=sun): its own anchor= says where it stands when play starts; the law that reads it (over=) its
  // modes, block by block, from its own 11:55
  const sec = (h: number) => Math.floor(h) * 3600 + Math.round((h % 1) * 100) * 60;
  const law = $derived([...ctx.program.cells.values()].find((c) => c.params.law === 'fiveto12' && c.over === d.name));
  const anchor = $derived(typeof cell?.params.anchor === 'number' ? sec(cell.params.anchor) : 0);
  const lawStart = sec(11.55);
  // where the piece is: playing, its time; stopped, where play will start
  const t = $derived(ctx.live?.seconds ?? ctx.cursor);
  const ofDay = $derived((((anchor + t) % 86400) + 86400) % 86400);
  const hhmm = $derived(`${Math.floor(ofDay / 3600)}:${String(Math.floor((ofDay % 3600) / 60)).padStart(2, '0')}`);
  const where = $derived(place(((((anchor - lawStart + t) % 86400) + 86400) % 86400) / SECONDS_PER_STEP));
  // a time of day, in turns: noon at the top, turning clockwise (east → south → west)
  const turns = (sec: number) => (sec / 3600 - 12) / 24;
  const at = (sec: number, r: number) => {
    const [x, y] = polar(R, R, r, turns(sec));
    return { x, y };
  };
  // a mode's brightness: Lydian 1 … Locrian 0
  const BRIGHT = [5, 3, 1, 6, 4, 2, 0].map((b) => b / 6); // by mode index: Ionian … Locrian
  const arc = (s0: number, s1: number, r0: number, r1: number) => ringSegment(R, R, r0, r1, turns(s0), turns(s1));
  const blocks = $derived(
    (law ? DAY_MODES : []).map((m, b) => ({ s0: lawStart + b * 7200, s1: lawStart + (b + 1) * 7200, light: BRIGHT[m], name: `${MODE_NAMES[m]} · ${BLOCK_NAMES[b]}` })),
  );
  const sun = $derived(at(ofDay, R * 0.62));
  const up = $derived(ofDay > 6 * 3600 && ofDay < 18 * 3600);

  // stopped: turning the sun moves where play starts (a full turn: a day)
  let last: number | null = null;
  const angleOf = (e: PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return turnOf(e.clientX, e.clientY, r.left + r.width / 2, r.top + r.height / 2);
  };
  function down(e: PointerEvent) {
    if (ctx.live || e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    last = angleOf(e);
  }
  function move(e: PointerEvent) {
    if (last === null) return;
    const a = angleOf(e);
    const da = turnDelta(last, a);
    last = a;
    ctx.nudge(da * 86400);
  }
  const up_ = () => (last = null);
  // the keyboard: stopped, the arrows turn it an hour
  function key(e: KeyboardEvent) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!step || ctx.live) return;
    e.preventDefault();
    e.stopPropagation();
    ctx.nudge(step * 3600);
  }
</script>

<div
  class="sun nodrag"
  data-wheel="sun"
  style:width="{S}px"
  style:height="{S}px"
  role="slider"
  tabindex="0"
  aria-label="The day"
  aria-valuetext="{hhmm}, {MODE_NAMES[where.mode]}, key of {NAMES[where.tonic]}"
  aria-valuenow={Math.floor(ofDay / 60)}
  aria-valuemin={0}
  aria-valuemax={1439}
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up_}
  onpointercancel={up_}
  onlostpointercapture={up_}
  onkeydown={key}
>
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  <svg viewBox="0 0 {S} {S}" width={S} height={S}>
    <defs>
      <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style:stop-color="var(--sky-day)" />
        <stop offset="0.48" style:stop-color="var(--sky-dusk)" />
        <stop offset="0.52" style:stop-color="var(--sky-dusk-night)" />
        <stop offset="1" style:stop-color="var(--sky-night)" />
      </linearGradient>
    </defs>
    <circle cx={R} cy={R} r={R - 2} fill="url(#{sky})" />
    <!-- the law's blocks, as bright as their modes -->
    {#each blocks as b, i (i)}
      <path d={arc(b.s0, b.s1, R * 0.82, R - 3)} fill={blockColour(b.light)} stroke="rgba(0,0,0,.45)" stroke-width="1"><title>{b.name}</title></path>
    {/each}
    <!-- the hours -->
    {#each Array.from({ length: 24 }, (_, h) => h) as h (h)}
      {@const p = at(h * 3600, R * 0.82)}
      {@const q = at(h * 3600, R * (h % 6 === 0 ? 0.72 : 0.77))}
      <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} class="tick" />
    {/each}
    <line x1="10" y1={R} x2={S - 10} y2={R} class="horizon" />
    <text class="cardinal" x={R} y="40">S</text>
    <text class="cardinal" x={R} y={S - 30}>N</text>
    <text class="cardinal" x="32" y={R + 4}>E</text>
    <text class="cardinal" x={S - 32} y={R + 4}>W</text>
    <!-- the sun (below the horizon: the night's sun, dimmed) -->
    <circle cx={sun.x} cy={sun.y} r="11" class="disc" class:night={!up} />
    <text class="time" x={R} y={R - 8}>{hhmm}</text>
    <text class="mode" x={R} y={R + 10}>{MODE_NAMES[where.mode]} · {NAMES[where.tonic]}</text>
    <text class="block" x={R} y={R + 24}>{BLOCK_NAMES[where.block]}</text>
  </svg>
  <span class="name">&{d.name}</span>
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
</div>

<style>
  .sun {
    position: relative;
    border-radius: 50%;
    touch-action: none;
    cursor: grab;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.5);
  }
  svg {
    display: block;
  }
  .tick {
    stroke: var(--sky-tick);
    stroke-width: 1.4;
  }
  .horizon {
    stroke: var(--sky-horizon);
    stroke-dasharray: 3 4;
  }
  .cardinal {
    fill: var(--sky-mark);
    font: 800 13px var(--font-ui);
    text-anchor: middle;
  }
  .disc {
    fill: var(--sun);
    stroke: var(--sun-edge);
    stroke-width: 2;
    filter: drop-shadow(0 0 8px var(--sun-glow));
  }
  .disc.night {
    fill: var(--sun-night);
    stroke: var(--sun-night-edge);
    filter: none;
    opacity: 0.7;
  }
  .time {
    fill: var(--sky-ink);
    font: 800 17px var(--font-code);
    text-anchor: middle;
    paint-order: stroke;
    stroke: var(--sky-ink-halo);
    stroke-width: 3px;
  }
  .mode,
  .block {
    fill: var(--sky-ink);
    font: 700 10px var(--font-ui);
    text-anchor: middle;
    paint-order: stroke;
    stroke: var(--sky-ink-halo);
    stroke-width: 3px;
  }
  .block {
    font-weight: 500;
    font-style: italic;
  }
  .name {
    position: absolute;
    left: 50%;
    top: 100%;
    transform: translate(-50%, 6px);
    font: 600 12px var(--font-code);
    color: var(--text-muted);
    white-space: nowrap;
  }
</style>
