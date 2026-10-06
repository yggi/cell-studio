<script lang="ts">
  /**
   * The sun: a day of 24 hours as the sky turns it — noon (S) at the top, midnight (N) at the bottom,
   * sunrise (E) on the left, sunset (W) on the right; the horizon through the middle. Round the rim, the
   * law's twelve blocks, each as bright as its mode. The sun stands where the piece is in its day.
   * Stopped, turning it moves where play starts.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { getGraphContext } from './context';
  import { BLOCK_NAMES, DAY_MODES, MODE_NAMES, place, SECONDS_PER_STEP } from '../engine/fiveto12';

  let { data }: NodeProps = $props();
  const d = $derived(data as { name: string });
  const ctx = getGraphContext();
  const S = 220;
  const R = S / 2;
  const cell = $derived(ctx.program.cells.get(d.name));
  const law = $derived(cell && typeof cell.params.sun === 'string' ? ctx.program.cells.get(cell.params.sun) : undefined);
  const anchor = $derived.by(() => {
    const a = law && typeof law.params.anchor === 'number' ? law.params.anchor : 11.55;
    return Math.floor(a) * 3600 + Math.round((a % 1) * 100) * 60;
  });
  // where the piece is: playing, its time; stopped, where play will start
  const t = $derived(ctx.live?.seconds ?? ctx.cursor);
  const ofDay = $derived((((anchor + t) % 86400) + 86400) % 86400);
  const hhmm = $derived(`${Math.floor(ofDay / 3600)}:${String(Math.floor((ofDay % 3600) / 60)).padStart(2, '0')}`);
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const where = $derived(place(t / SECONDS_PER_STEP));
  // the angle of a time of day: noon at the top, turning clockwise (east → south → west)
  const ang = (sec: number) => ((sec / 3600 - 12) / 24) * 2 * Math.PI;
  const at = (sec: number, r: number) => ({ x: R + r * Math.sin(ang(sec)), y: R - r * Math.cos(ang(sec)) });
  // a mode's brightness: Lydian 1 … Locrian 0
  const BRIGHT = [5, 3, 1, 6, 4, 2, 0].map((b) => b / 6); // by mode index: Ionian … Locrian
  const arc = (s0: number, s1: number, r0: number, r1: number) => {
    const a = at(s0, r1);
    const b = at(s1, r1);
    const c = at(s1, r0);
    const e = at(s0, r0);
    return `M${a.x},${a.y} A${r1},${r1} 0 0 1 ${b.x},${b.y} L${c.x},${c.y} A${r0},${r0} 0 0 0 ${e.x},${e.y} Z`;
  };
  const blocks = $derived(DAY_MODES.map((m, b) => ({ s0: anchor + b * 7200, s1: anchor + (b + 1) * 7200, light: BRIGHT[m], name: `${MODE_NAMES[m]} · ${BLOCK_NAMES[b]}` })));
  const sun = $derived(at(ofDay, R * 0.62));
  const up = $derived(ofDay > 6 * 3600 && ofDay < 18 * 3600);

  // stopped: turning the sun moves where play starts (a full turn: a day)
  let last: number | null = null;
  const angleOf = (e: PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2)));
  };
  function down(e: PointerEvent) {
    if (ctx.live) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    last = angleOf(e);
  }
  function move(e: PointerEvent) {
    if (last === null) return;
    const a = angleOf(e);
    let da = a - last;
    if (da > Math.PI) da -= 2 * Math.PI;
    if (da < -Math.PI) da += 2 * Math.PI;
    last = a;
    ctx.nudge((da / (2 * Math.PI)) * 86400);
  }
  const up_ = () => (last = null);
</script>

<div class="sun nodrag" data-wheel="sun" style:width="{S}px" style:height="{S}px" role="img" aria-label="The day: {hhmm}, {MODE_NAMES[where.mode]}, key of {NAMES[where.tonic]}" onpointerdown={down} onpointermove={move} onpointerup={up_} onpointercancel={up_}>
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  <svg viewBox="0 0 {S} {S}" width={S} height={S}>
    <defs>
      <linearGradient id="sky-{d.name}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3d6fa8" />
        <stop offset="0.48" stop-color="#e3a25a" />
        <stop offset="0.52" stop-color="#2a1c3a" />
        <stop offset="1" stop-color="#070912" />
      </linearGradient>
    </defs>
    <circle cx={R} cy={R} r={R - 2} fill="url(#sky-{d.name})" />
    <!-- the law's blocks, as bright as their modes -->
    {#each blocks as b, i (i)}
      <path d={arc(b.s0, b.s1, R * 0.82, R - 3)} fill="hsl(45 {30 + 60 * b.light}% {14 + 62 * b.light}%)" stroke="rgba(0,0,0,.45)" stroke-width="1"><title>{b.name}</title></path>
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
    stroke: rgba(255, 255, 255, 0.55);
    stroke-width: 1.4;
  }
  .horizon {
    stroke: rgba(255, 255, 255, 0.35);
    stroke-dasharray: 3 4;
  }
  .cardinal {
    fill: rgba(255, 255, 255, 0.85);
    font: 800 13px var(--font-ui);
    text-anchor: middle;
  }
  .disc {
    fill: #ffd84a;
    stroke: #fff3b0;
    stroke-width: 2;
    filter: drop-shadow(0 0 8px #ffcf3a);
  }
  .disc.night {
    fill: #8a7a40;
    stroke: #b8aa70;
    filter: none;
    opacity: 0.7;
  }
  .time {
    fill: #fff;
    font: 800 17px var(--font-code);
    text-anchor: middle;
    paint-order: stroke;
    stroke: rgba(0, 0, 0, 0.6);
    stroke-width: 3px;
  }
  .mode,
  .block {
    fill: #fff;
    font: 700 10px var(--font-ui);
    text-anchor: middle;
    paint-order: stroke;
    stroke: rgba(0, 0, 0, 0.6);
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
