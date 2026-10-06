<script lang="ts" module>
  // (each one's own ids for its gradients: the same cell can be drawn twice at once)
  let tables = 0;
</script>

<script lang="ts">
  /**
   * A physical cell (a meter with a motor, a belted cell) as a turntable: a raised disc of
   * material, its rim knurled, an axle at its centre. It turns at its true angle (spin-up, sag,
   * coasting, a hand). The axle: tap for its details, hold and move to place it. The disc: grab
   * it — while your finger is down, it's pulled towards your finger's speed (push, brake, scratch);
   * let go, and its motor takes over.
   */
  import { onDestroy } from 'svelte';
  import { Handle, Position, useSvelteFlow, type NodeProps } from '@xyflow/svelte';
  import { getGraphContext, nodeState } from './context';
  import { clocking } from '../engine/clocking';
  import { BODIES } from '../engine/program';
  import { onFrames } from '../audio/ticker';
  import { timed } from '../audio/stats';
  import FreePills from './FreePills.svelte';
  import { headAngle as tapeHeadAngle, tapeHeads, UNTURNED } from '../layout/tape';
  import { polar as onCircle } from '../layout/geometry';
  import { angleOf, turnDelta } from '../layout/dial';
  import { NOTE_NAMES as NAMES } from '../theory/modes';

  let { id, data }: NodeProps = $props();
  const d = $derived(data as { name: string; size: number; role: 'motor' | 'belt' | 'tape' | 'resonator'; turn?: number });
  const ctx = getGraphContext();
  const look = $derived(nodeState(ctx, id));
  const flow = useSvelteFlow();
  const S = $derived(d.size);
  const R = $derived(S / 2);

  // ---- a resonator: how it's ringing — each mode squashes and stretches the disc along its own axis
  let amps = $state.raw<number[]>([]);
  let pads = $state.raw<number[]>([]);
  // its exciters: one pad each round the wheel, named by the note it sounds
  const exciters = $derived.by(() => {
    if (d.role !== 'resonator' || !cell?.exciters) return [];
    const f0 = cell.freq > 0 ? cell.freq : 440;
    return cell.exciters.map((x) => {
      const midi = Math.round(69 + 12 * Math.log2((f0 * Math.pow(2, x.shift / 12)) / 440));
      return { name: NAMES[((midi % 12) + 12) % 12] + Math.floor(midi / 12 - 1) };
    });
  });
  let wobble = $state('none');
  // (a shimmer, set from here: the reduced-motion rule in app.css only reaches CSS animations)
  const still = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  $effect(() => {
    if (d.role !== 'resonator') return;
    const step = (t: number) => {
      const r = ctx.resonance(d.name);
      if (!r) {
        if (wobble !== 'none') (wobble = 'none'), (amps = []), (pads = []);
        return;
      }
      const a = r.modes;
      // (each ring's brightness in 24 steps, and only written when one changed: a ring's style is a repaint)
      const q = a.map((v: number) => Math.round(v * 24) / 24);
      if (q.length !== amps.length || q.some((v: number, i: number) => v !== amps[i])) amps = q;
      pads = r.exciters;
      if (still?.matches) {
        if (wobble !== 'none') wobble = 'none';
        return;
      }
      // M = I + Σ dₖ (uₖuₖᵀ − vₖvₖᵀ): mode k's axis at k/n of a half-turn, its stretch oscillating (higher
      // modes faster — a visible rate, not the real one), its depth its strength
      let m00 = 1;
      let m01 = 0;
      let m11 = 1;
      a.forEach((amp: number, k: number) => {
        const th = (k / Math.max(1, a.length)) * Math.PI;
        const dk = 0.07 * amp * amp * Math.sin((2 * Math.PI * (4 + 3 * k) * t) / 1000);
        const c = Math.cos(2 * th);
        const s2 = Math.sin(2 * th);
        m00 += dk * c;
        m11 -= dk * c;
        m01 += dk * s2;
      });
      wobble = `matrix(${m00.toFixed(4)}, ${m01.toFixed(4)}, ${m01.toFixed(4)}, ${m11.toFixed(4)}, 0, 0)`;
    };
    // (~30 a second: the wobble is a slow shimmer, and reading the analyser is not free)
    return onFrames((t) => timed('resonator', () => step(t)), () => 33);
  });

  // reset (reload from code): what hands left — a recording, a reel's turn — is gone
  let seenEpoch = ctx.epoch;
  $effect(() => {
    if (ctx.epoch === seenEpoch) return;
    seenEpoch = ctx.epoch;
    rec = new Array(96).fill(0);
    reelOffset = 0;
  });

  // ---- a tape: its heads, where they sit, and what's been recorded round it
  const tape = $derived.by(() => {
    if (d.role !== 'tape' || !cell) return null;
    const { heads, length: L } = tapeHeads(cell, ctx.program.cells.values());
    const erase = typeof cell.params.erase === 'number' ? Math.min(1, Math.max(0, cell.params.erase)) : 1;
    return { heads, L, erase };
  });
  // (the write head where the layout turned the tape (on top if not); a read head further round by how far
  // along the tape it reads: layout/tape.ts)
  const turn = $derived(d.turn ?? UNTURNED);
  const headAngle = (at: number) => (tape ? tapeHeadAngle(at, tape.L, turn) : turn);
  // (degrees here, 0 at 3 o'clock, as SVG's rotate() counts them)
  const polar = (deg: number, r: number) => {
    const [x, y] = onCircle(R, R, r, (deg + 90) / 360);
    return { x, y };
  };
  const N = 96;
  let rec = $state.raw<number[]>(new Array(96).fill(0)); // (replaced whole each time: raw)
  let tapeAt = $state(0);
  $effect(() => {
    const t = tape;
    if (!t) return;
    let last = -1;
    let running = false;
    const step = () => {
      const p = ctx.tapePos(d.name);
      if (p === null) return void (running = false);
      // (a new run starts on a blank tape — the sound's was wound off when it stopped)
      if (!running) {
        running = true;
        rec = new Array(N).fill(0);
        last = -1;
      }
      const level = ctx.tapeLevel(d.name) ?? 0;
      const c = ((p % t.L) + t.L) % t.L;
      const b = Math.floor((c / t.L) * N) % N;
      // the stretch under the write head: what's recorded now, over what erasing left of before
      if (b !== last) {
        const next = rec.slice();
        next[b] = Math.min(1, level + next[b] * (1 - t.erase));
        rec = next;
        last = b;
      } else if (level > rec[b] * 0.999) {
        const next = rec.slice();
        next[b] = Math.min(1, Math.max(next[b], level));
        rec = next;
      }
      tapeAt = p;
    };
    return onFrames(() => timed('tape', () => step()), () => 33);
  });
  const AXLE = $derived(R * 0.2);

  // its angle: where its clock is (while playing); else wherever a hand left it
  let preview = $state(0);
  const cell = $derived(ctx.program.cells.get(d.name));
  const lap = $derived(Math.max(1, cell?.steps ?? 4));
  // a hand holding a tape: the reel turns with the hand, not the clock
  let scrubbing = $state(false);
  let handAngle = $state(0);
  // the turn a hand gave it: it stays (the reel turns on from where it was left)
  let reelOffset = $state(0);
  const angle = $derived.by(() => {
    if (scrubbing) return handAngle;
    if (!ctx.live || !cell) return preview;
    try {
      const steps = clocking(ctx.program, ctx.shifts, ctx.live.seconds).stepOf(cell.clock ?? d.name) * (cell.clock === d.name ? 1 : cell.rate);
      return ((steps % lap) / lap) * 360 + reelOffset;
    } catch {
      return preview;
    }
  });
  const clockAngle = () => {
    if (!ctx.live || !cell) return preview;
    try {
      const steps = clocking(ctx.program, ctx.shifts, ctx.live.seconds).stepOf(cell.clock ?? d.name) * (cell.clock === d.name ? 1 : cell.rate);
      return ((steps % lap) / lap) * 360;
    } catch {
      return preview;
    }
  };
  // its nominal angular speed (rad/s): a lap of its steps at its clock's rate — what speed 1 means
  const omega0 = $derived.by(() => {
    const clk = ctx.program.clocks.get(cell?.clock ?? d.name);
    return clk ? (2 * Math.PI * clk.perSecond * (cell?.clock === d.name ? 1 : (cell?.rate ?? 1))) / lap : 1;
  });

  let mode: 'none' | 'axle' | 'move' | 'grab' | 'scrub' | 'touch' | 'damp' | 'bowing' = 'none';
  let touchAt = { x: 0, y: 0, t: 0, pos: 0.5 };
  let bowLast = { x: 0, y: 0, t: 0 };
  // scrubbing: where the hand holds the tape (tape-seconds), and the furthest written
  let scrubAt = 0;
  let scrubTop = 0;
  let hold: ReturnType<typeof setTimeout> | null = null;
  let renew: ReturnType<typeof setInterval> | null = null;
  let start = { x: 0, y: 0 };
  let last = { a: 0, t: 0 };
  let smooth = 0;
  let sent = 0;
  let el: HTMLDivElement;
  const centre = () => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, scale: r.width / S };
  };
  // where the pointer is round the centre (radians, clockwise) and how far it has turned since `from`
  const angleAt = (e: PointerEvent) => {
    const c = centre();
    return angleOf(e.clientX, e.clientY, c.x, c.y) * 2 * Math.PI;
  };
  const turned = (from: number, to: number) => turnDelta(from / (2 * Math.PI), to / (2 * Math.PI)) * 2 * Math.PI;
  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const c = centre();
    const dist = Math.hypot(e.clientX - c.x, e.clientY - c.y) / c.scale;
    el.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY };
    if (dist <= AXLE * 1.5) {
      // the axle: a tap opens it; held, it moves
      mode = 'axle';
      hold = setTimeout(() => {
        mode = 'move';
        const p = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
        ctx.move(id, 'start', p.x, p.y);
        navigator.vibrate?.(12);
      }, 400);
      return;
    }
    // a resonator: a quick tap strikes it there (the centre .5, the rim 0); held still, a hand damps
    // it; dragged across, a bow
    if (d.role === 'resonator') {
      mode = 'touch';
      touchAt = { x: e.clientX, y: e.clientY, t: performance.now(), pos: Math.max(0, Math.min(0.5, 0.5 - (dist / R) * 0.5)) };
      hold = setTimeout(() => {
        mode = 'damp';
        ctx.damp(d.name, true);
        navigator.vibrate?.(8);
      }, 220);
      return;
    }
    // a sound tape's reel: the hand holds the tape itself — scrubbing (a turn: a second of tape)
    const u0 = d.role === 'tape' ? ctx.tapePos(d.name) : null;
    if (u0 !== null) {
      mode = 'scrub';
      handAngle = clockAngle() + reelOffset;
      scrubbing = true;
      scrubAt = u0;
      scrubTop = u0;
      last = { a: angleAt(e), t: performance.now() };
      ctx.scrub(d.name, scrubAt);
      return;
    }
    // the disc: a hand on it — renewed while the finger is down (a still finger brakes)
    mode = 'grab';
    last = { a: angleAt(e), t: performance.now() };
    smooth = 0;
    if (ctx.live) ctx.grab(d.name, 0);
    renew = setInterval(() => {
      if (performance.now() - last.t > 80) smooth *= 0.5; // (not moving: slowing to a stop)
      if (ctx.live) ctx.grab(d.name, smooth / omega0);
    }, 100);
  }
  function move(e: PointerEvent) {
    if (mode === 'axle' && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8 && hold) {
      clearTimeout(hold);
      hold = null;
      mode = 'none';
    } else if (mode === 'move') {
      const p = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      ctx.move(id, 'move', p.x, p.y);
    } else if ((mode === 'touch' || mode === 'damp') && Math.hypot(e.clientX - touchAt.x, e.clientY - touchAt.y) > 8) {
      // dragged: a bow, its pressure the hand's speed
      if (hold) clearTimeout(hold);
      hold = null;
      if (mode === 'damp') ctx.damp(d.name, false);
      mode = 'bowing';
      bowLast = { x: e.clientX, y: e.clientY, t: performance.now() };
    } else if (mode === 'bowing') {
      const t = performance.now();
      const v = Math.hypot(e.clientX - bowLast.x, e.clientY - bowLast.y) / Math.max(1, t - bowLast.t); // px/ms
      bowLast = { x: e.clientX, y: e.clientY, t };
      ctx.bow(d.name, Math.min(0.6, v * 0.25));
    } else if (mode === 'scrub') {
      const a = angleAt(e);
      const da = turned(last.a, a);
      last = { a, t: performance.now() };
      // (back as far as the tape holds; forward no further than what has been written)
      scrubAt = Math.min(scrubTop, Math.max(scrubTop - 4, scrubAt + da / (2 * Math.PI)));
      handAngle += (da * 180) / Math.PI;
      ctx.scrub(d.name, scrubAt);
    } else if (mode === 'grab') {
      const a = angleAt(e);
      const t = performance.now();
      const da = turned(last.a, a);
      const dt = Math.max(1, t - last.t) / 1000;
      smooth = smooth * 0.6 + (da / dt) * 0.4; // the finger's angular speed (rad/s), smoothed
      last = { a, t };
      if (ctx.live) {
        if (t - sent > 30) {
          sent = t;
          ctx.grab(d.name, smooth / omega0);
        }
      } else {
        turnStopped(da);
      }
    }
  }
  // stopped: turning it moves where play starts — a turn, as long as it takes to turn once
  function turnStopped(da: number) {
    preview += (da * 180) / Math.PI;
    if (cell?.clock)
      try {
        const m = clocking(ctx.program, ctx.shifts, 0).map(cell.clock);
        const turn = m.q(lap / (cell.clock === d.name ? 1 : cell.rate)) - m.q(0);
        if (Number.isFinite(turn) && turn > 0) ctx.nudge((da / (2 * Math.PI)) * turn);
      } catch {
        // (a clock that can't say: it just turns)
      }
  }
  // the keyboard: Enter or Space opens it; stopped, the arrows turn it a sixteenth
  function key(e: KeyboardEvent) {
    if (e.target !== e.currentTarget) return; // (a resonator's pads are buttons of their own)
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ctx.open(d.name);
      return;
    }
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!step || ctx.live || d.role === 'resonator') return;
    e.preventDefault();
    e.stopPropagation();
    turnStopped((step * 2 * Math.PI) / 16);
  }
  function up(e: PointerEvent) {
    if (hold) clearTimeout(hold);
    hold = null;
    if (renew) clearInterval(renew);
    renew = null;
    if (mode === 'axle') ctx.open(d.name);
    else if (mode === 'move') {
      const p = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      ctx.move(id, 'end', p.x, p.y);
    } else if (mode === 'grab' && ctx.live) ctx.grab(d.name, null);
    else if (mode === 'touch') ctx.strike(d.name, touchAt.pos);
    else if (mode === 'damp') ctx.damp(d.name, false);
    else if (mode === 'bowing') ctx.bow(d.name, null);
    else if (mode === 'scrub') {
      ctx.scrub(d.name, null);
      reelOffset = handAngle - clockAngle();
      scrubbing = false;
    }
    mode = 'none';
  }
  // gone mid-gesture (a code edit, another piece): no timer left running, no hand left on it
  onDestroy(() => {
    if (hold) clearTimeout(hold);
    if (renew) clearInterval(renew);
    if (mode === 'grab') ctx.grab(d.name, null);
    else if (mode === 'damp') ctx.damp(d.name, false);
    else if (mode === 'bowing') ctx.bow(d.name, null);
    else if (mode === 'scrub') ctx.scrub(d.name, null);
  });
  const modeRings = $derived.by(() => {
    const body = cell && typeof cell.params.body === 'string' ? BODIES[cell.params.body] : undefined;
    return (body ?? []).map(([r]) => Math.max(0.3, 0.92 - Math.log2(Math.max(1, r)) * 0.18));
  });
  const ticks = Array.from({ length: 60 }, (_, i) => (i / 60) * 2 * Math.PI);
  const uid = `mat${++tables}`;
</script>

<div
  class="turntable nodrag nopan {d.role}"
  data-wheel="material"
  data-mode={d.role}
  data-state={look}
  bind:this={el}
  style:width="{S}px"
  style:height="{S}px"
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  onlostpointercapture={up}
  onclick={(e) => e.stopPropagation()}
  role="button"
  tabindex="0"
  aria-label="&{d.name}: a turntable — tap the axle for its details, drag the disc to grab it"
  onkeydown={key}
>
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  <svg viewBox="0 0 {S} {S}" width={S} height={S} aria-hidden="true" style:transform={wobble} style:transform-origin="50% 50%">
    <defs>
      <radialGradient id="{uid}-disc" cx="40%" cy="35%" r="75%">
        <stop offset="0%" style:stop-color="var(--disc-{d.role}-0)" />
        <stop offset="70%" style:stop-color="var(--disc-{d.role}-1)" />
        <stop offset="100%" style:stop-color="var(--disc-{d.role}-2)" />
      </radialGradient>
      <radialGradient id="{uid}-axle" cx="35%" cy="30%" r="80%">
        <stop offset="0%" style:stop-color="var(--axle-0)" />
        <stop offset="55%" style:stop-color="var(--axle-1)" />
        <stop offset="100%" style:stop-color="var(--axle-2)" />
      </radialGradient>
    </defs>
    <circle cx={R} cy={R} r={R - 1} fill="url(#{uid}-disc)" stroke="rgba(255,255,255,.12)" stroke-width="1" />
    <!-- what turns: the knurled rim, the grooves, a mark -->
    <g transform="rotate({angle} {R} {R})">
      {#each ticks as a, i (i)}
        <line x1={R + (R - 3) * Math.cos(a)} y1={R + (R - 3) * Math.sin(a)} x2={R + (R - (i % 5 ? 9 : 14)) * Math.cos(a)} y2={R + (R - (i % 5 ? 9 : 14)) * Math.sin(a)} class="tick" />
      {/each}
      {#if d.role === 'resonator'}
        <!-- a body: rings where its modes are (the higher, the further in) -->
        {#each modeRings as k, i (i)}<circle cx={R} cy={R} r={R * k} class="modering" style:stroke-opacity={0.35 + 0.65 * (amps[i] ?? 0)} />{/each}
      {:else if d.role === 'tape'}
        <!-- a reel: the wound tape (oxide brown), its layers, and the hub's three spokes -->
        <circle cx={R} cy={R} r={R * 0.78} class="pack" />
        {#each [0.5, 0.58, 0.66, 0.74] as k (k)}<circle cx={R} cy={R} r={R * k} class="layer" />{/each}
        <circle cx={R} cy={R} r={R * 0.4} class="hub" />
        {#each [0, 120, 240] as a (a)}
          <rect x={R - R * 0.05} y={R - R * 0.38} width={R * 0.1} height={R * 0.2} rx={R * 0.03} transform="rotate({a} {R} {R})" class="spoke" />
        {/each}
      {:else}
        {#each [0.55, 0.68, 0.8] as k (k)}<circle cx={R} cy={R} r={R * k} class="groove" />{/each}
      {/if}
      <circle cx={R} cy={R - R * 0.74} r={R * 0.06} class="mark" />
    </g>
    <circle cx={R} cy={R} r={AXLE} fill="url(#{uid}-axle)" stroke="rgba(0,0,0,.5)" />
    <circle cx={R} cy={R} r={AXLE * 0.3} style:fill="var(--axle-bore)" />
    {#if tape}
      <!-- the recording, round the tape: each stretch where the tape has carried it from the write head -->
      <!-- (the stretches are set where the write head left them and the group turns with the tape: one
           transform a frame, not four attributes on each of ~100 lines) -->
      <g class="recording" aria-hidden="true" transform="rotate({((tapeAt / tape.L) * 360) % 360} {R} {R})">
        {#each rec as l, j (j)}
          {#if l > 0.02}
            {@const cj = ((j + 0.5) / N) * tape.L}
            {@const deg = turn - (cj / tape.L) * 360}
            {@const a = polar(deg, R * 0.79)}
            {@const b2 = polar(deg, R * (0.79 + 0.16 * l))}
            <line x1={a.x} y1={a.y} x2={b2.x} y2={b2.y} style:opacity={0.35 + 0.65 * l} />
          {/if}
        {/each}
      </g>
      <!-- the heads, fixed on the turned wheel: the write head, the read heads where they sit -->
      {@const w = polar(turn, R * 0.97)}
      <rect class="head write" x={w.x - 6} y={w.y - 4} width="12" height="8" rx="2" transform="rotate({turn + 90} {w.x} {w.y})" />
      {#each tape.heads as h (h.name)}
        {@const p = polar(headAngle(h.at), R * 0.97)}
        <rect class="head read" x={p.x - 5} y={p.y - 4} width="10" height="8" rx="2" transform="rotate({headAngle(h.at) + 90} {p.x} {p.y})" />
      {/each}
    {/if}
  </svg>
  {#if exciters.length > 1}
    <!-- its exciters: petal pads round the wheel — tap one to play it -->
    {#each exciters as x, i (i)}
      {@const deg = -90 + (i / exciters.length) * 360}
      {@const pr = Math.max(9, Math.min(16, (Math.PI * R * 1.2) / exciters.length - 2))}
      {@const p = polar(deg, R * 1.2)}
      <button
        class="pad"
        style:left="{p.x}px"
        style:top="{p.y}px"
        style:width="{pr * 2}px"
        style:height="{pr * 2}px"
        style:font-size="{Math.max(7, pr * 0.62)}px"
        style:--glow={pads[i] ?? 0}
        aria-label="Play {x.name}"
        onpointerdown={(e) => e.stopPropagation()}
        onclick={(e) => {
          e.stopPropagation();
          ctx.strike(d.name, 0.5, i); // (playing or not: a body rings whether or not the clocks run)
        }}>{x.name.replace(/-?\d+$/, '')}</button
      >
    {/each}
  {/if}
  <span class="name" style:margin-top={exciters.length > 1 ? `${R * 0.42}px` : undefined}>&{d.name}</span>
  {#if cell?.frees.length}<FreePills frees={cell.frees} name={d.name} />{/if}
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
  {#if tape}
    <!-- edges meet the tape at its heads -->
    {@const w = polar(turn, R * 1.02)}
    <Handle type="target" id="head-write" position={Position.Top} class="head-handle" style="left: {w.x}px; top: {w.y}px" isConnectable={false} />
    {#each tape.heads as h (h.name)}
      {@const p = polar(headAngle(h.at), R * 1.02)}
      <Handle type="source" id="head-{h.name}" position={Position.Bottom} class="head-handle" style="left: {p.x}px; top: {p.y}px" isConnectable={false} />
    {/each}
  {/if}
</div>

<style>
  /* raised: a body above everything else */
  .turntable {
    position: relative;
    border-radius: 50%;
    cursor: grab;
    touch-action: none;
    filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.55)) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
  }
  .turntable:active {
    cursor: grabbing;
  }
  .turntable:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
  }
  svg {
    display: block;
  }
  .tick {
    stroke: rgba(255, 255, 255, 0.22);
    stroke-width: 1.4;
  }
  .groove {
    fill: none;
    stroke: rgba(255, 255, 255, 0.05);
    stroke-width: 2;
  }
  .mark {
    fill: var(--accent);
  }
  .name {
    position: absolute;
    left: 50%;
    top: calc(100% + 6px);
    transform: translateX(-50%);
    font: 700 13px var(--font-code);
    color: var(--text);
    white-space: nowrap;
    text-shadow: 0 1px 3px var(--bg);
    pointer-events: none;
  }
  .pack {
    fill: var(--reel-pack);
    stroke: rgba(0, 0, 0, 0.5);
  }
  .layer {
    fill: none;
    stroke: var(--reel-layer);
    stroke-width: 1;
  }
  .hub {
    fill: var(--reel-hub);
    stroke: rgba(255, 255, 255, 0.12);
  }
  .spoke {
    fill: var(--reel-spoke);
  }
  .modering {
    fill: none;
    stroke: var(--resonator-mode);
    stroke-width: 1.2;
  }
  .recording line {
    stroke: var(--tape-recorded);
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  .head {
    stroke: rgba(0, 0, 0, 0.6);
    stroke-width: 1;
  }
  .head.write {
    fill: var(--head-write);
  }
  .head.read {
    fill: var(--head-read);
  }
  :global(.head-handle) {
    width: 4px !important;
    height: 4px !important;
    min-width: 0 !important;
    min-height: 0 !important;
    opacity: 0;
    transform: translate(-50%, -50%) !important;
  }
  /* an exciter's pad: brass, glowing as it rings */
  .pad {
    position: absolute;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.5);
    background: radial-gradient(circle at 35% 30%, var(--pad-0), var(--pad-1) 70%);
    color: var(--pad-ink);
    font-weight: 800;
    font-family: var(--font-ui);
    padding: 0;
    cursor: pointer;
    box-shadow: 0 0 calc(var(--glow) * 14px) color-mix(in srgb, var(--pad-glow) calc(var(--glow) * 90%), transparent);
    filter: brightness(calc(0.85 + var(--glow) * 0.5));
    z-index: 2;
  }
  .pad:active {
    transform: translate(-50%, -50%) scale(0.92);
  }
</style>
