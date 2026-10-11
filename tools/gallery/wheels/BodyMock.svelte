<script lang="ts">
  /**
   * A resonator's wheel as it could be drawn, for the bodies question (Mockups.svelte, section 2): a body (`body=`) and
   * its exciters (semitones), under one option. Drawn here in SVG only, from the real wheel's proportions (its disc,
   * its mode rings, its exciters at EXCITER_RING of its radius, the first at the top): nothing in the app changes.
   *
   * - `now`: the brass disc, its mode rings, brass pads round it (when more than one exciter), as the app draws today
   * - `shape`: each exciter drawn as its body's element where its pad is, reaching out to its strand (the tines, generalised)
   * - `face`: `shape`, and the body itself drawn on the disc's face (what a single exciter, the usual case, shows)
   * - `material`: `face`, on a disc of the body's material (wood, steel, brass, organ metal)
   */
  import { BODIES } from '../../../src/engine/program';
  // (where a strand meets its exciter, in parts of the wheel's radius: layout/tines.ts EXCITER_RING once #302 is in)
  const EXCITER_RING = 1.2;

  let { body, shifts, option, ringing = 0 }: { body: string; shifts: number[]; option: 'now' | 'shape' | 'face' | 'material'; ringing?: number } = $props();

  const r = 60;
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const low = $derived(Math.min(...shifts));
  const n = $derived(shifts.length);
  const out = r * EXCITER_RING;
  // (the element's length by pitch: a cantilever or a bar as 1/√f, a pipe as 1/f, a cup or a plate's size as 1/∛f)
  const by = (p: number, per: number) => Math.pow(2, -(p - low) / per);
  const uid = `bm${Math.random().toString(36).slice(2, 8)}`;

  // the disc's material
  const MATERIAL: Record<string, [string, string, string]> = {
    fork: ['#f0d58a', '#b8902f', '#6e5216'],
    bell: ['#e9c27a', '#a8742a', '#5c3c10'],
    tine: ['#e6e9ee', '#9aa1ab', '#4a4f57'],
    wire: ['#d7c29a', '#8c6a3c', '#4a3418'],
    spring: ['#dfe3ea', '#8e96a3', '#454b55'],
    plate: ['#d9dde3', '#8f97a3', '#4b525c'],
    bar: ['#c9875a', '#7a3f20', '#3e1d0c'],
    box: ['#d9a96a', '#94642f', '#4f3214'],
    pipe: ['#e3e1d6', '#a29d88', '#585443'],
  };
  const BRASS: [string, string, string] = ['#f0d58a', '#b8902f', '#6e5216'];
  const disc = $derived(option === 'material' ? (MATERIAL[body] ?? BRASS) : BRASS);
  const rings = $derived((BODIES[body] ?? []).map(([q]) => Math.max(0.3, 0.92 - Math.log2(Math.max(1, q)) * 0.18)));
  const ink = $derived(option === 'material' ? disc[2] : '#6e5216');
  const showFace = $derived(option === 'face' || option === 'material');
  const showShapes = $derived(option !== 'now');
  const name = (p: number) => NAMES[(((p + 9) % 12) + 12) % 12]; // (from A, as the forks' loop=A…)
</script>

<svg viewBox="{-r * 1.45} {-r * 1.45} {r * 2.9} {r * 2.9}" width="176" height="176" data-body={body} data-option={option}>
  <defs>
    <radialGradient id="{uid}-d" cx="40%" cy="35%" r="75%">
      <stop offset="0" stop-color={disc[0]} /><stop offset=".7" stop-color={disc[1]} /><stop offset="1" stop-color={disc[2]} />
    </radialGradient>
    <linearGradient id="{uid}-steel" x1="0" x2="1">
      <stop offset="0" stop-color="#8d949e" /><stop offset=".45" stop-color="#e6e9ee" /><stop offset="1" stop-color="#8d949e" />
    </linearGradient>
    <linearGradient id="{uid}-wood" x1="0" x2="1">
      <stop offset="0" stop-color="#6b3418" /><stop offset=".45" stop-color="#b8693a" /><stop offset="1" stop-color="#6b3418" />
    </linearGradient>
    <linearGradient id="{uid}-brass" x1="0" x2="1">
      <stop offset="0" stop-color="#a87b2c" /><stop offset=".45" stop-color="#f3d98a" /><stop offset="1" stop-color="#a87b2c" />
    </linearGradient>
    <linearGradient id="{uid}-pipe" x1="0" x2="1">
      <stop offset="0" stop-color="#7d7a6c" /><stop offset=".4" stop-color="#ecebe3" /><stop offset="1" stop-color="#7d7a6c" />
    </linearGradient>
    <filter id="{uid}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
  </defs>

  <!-- the disc: its material, its knurled rim -->
  <circle r={r - 1} fill="url(#{uid}-d)" stroke="rgba(255,255,255,.12)" />
  {#each Array.from({ length: 60 }, (_, i) => (i / 60) * 2 * Math.PI) as a, i (i)}
    <line
      x1={Math.cos(a) * (r - 3)}
      y1={Math.sin(a) * (r - 3)}
      x2={Math.cos(a) * (r - (i % 5 ? 8 : 12))}
      y2={Math.sin(a) * (r - (i % 5 ? 8 : 12))}
      stroke="rgba(0,0,0,.25)"
      stroke-width="1"
    />
  {/each}

  {#if !showFace}
    {#each rings as k, i (i)}<circle r={r * k} fill="none" stroke="rgba(255,240,200,.55)" stroke-width="1.2" opacity={0.4 + 0.6 * (i === 0 ? ringing : 0)} />{/each}
  {:else}
    <!-- the body on its face, engraved; its moving part ghosted while it rings -->
    <g fill="none" stroke={ink} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(1px 1px 0 rgba(255,255,255,.45))">
      {#if body === 'fork'}
        <path d="M0 48 V22 M-17 -44 V4 Q-17 22 0 22 Q17 22 17 4 V-44" />
        {#if ringing}<path d="M-21 -44 V4 M21 -44 V4" opacity=".35" />{/if}
      {:else if body === 'bell'}
        <circle r="40" /><circle r="27" /><circle r="12" />
        {#each [0, 45, 90, 135] as a (a)}<line
            x1={-40 * Math.cos((a * Math.PI) / 180)}
            y1={-40 * Math.sin((a * Math.PI) / 180)}
            x2={40 * Math.cos((a * Math.PI) / 180)}
            y2={40 * Math.sin((a * Math.PI) / 180)}
            stroke-dasharray="3 4"
            stroke-width="1.2"
          />{/each}
      {:else if body === 'bar'}
        <rect x="-46" y="-17" width="92" height="34" rx="3" />
        <line x1={-46 + 92 * 0.224} y1="-22" x2={-46 + 92 * 0.224} y2="22" stroke-dasharray="2 3" stroke-width="1.2" />
        <line x1={-46 + 92 * 0.776} y1="-22" x2={-46 + 92 * 0.776} y2="22" stroke-dasharray="2 3" stroke-width="1.2" />
        {#if ringing}<path d="M-46 0 Q-24 14 0 -14 Q24 14 46 0" stroke-width="1.4" opacity=".5" />{/if}
      {:else if body === 'plate'}
        <rect x="-32" y="-32" width="64" height="64" rx="2" />
        <path d="M-32 -12 Q0 6 32 -12 M-32 12 Q0 -6 32 12 M-12 -32 Q6 0 -12 32 M12 -32 Q-6 0 12 32" stroke-width="1.2" />
      {:else if body === 'box'}
        <rect x="-40" y="-32" width="80" height="64" rx="4" />
        <circle r="19" />
        <line x1="-34" y1="-18" x2="34" y2="-18" stroke-width="1" />
      {:else if body === 'pipe'}
        <rect x="-17" y="-46" width="34" height="78" rx="3" />
        <path d="M-17 32 L0 48 L17 32" />
        <rect x="-9" y="22" width="18" height="6" stroke-width="2" />
        {#if ringing}<path d="M0 -46 Q-10 -14 0 22" stroke-width="1.2" opacity=".5" />{/if}
      {:else if body === 'wire'}
        <line x1="-30" y1="-38" x2="30" y2="-38" stroke-width="4" />
        <line x1="-30" y1="38" x2="30" y2="38" stroke-width="4" />
        {#each [-27, -18, 18, 27] as x, i (x)}<line x1={x} y1="-38" x2={x} y2="38" stroke-width={2 - i * 0.3} />{/each}
        {#if ringing}<path d="M-27 -38 Q-20 0 -27 38 Q-34 0 -27 -38" stroke-width="1" opacity=".5" />{/if}
      {:else if body === 'spring'}
        <path d={Array.from({ length: 9 }, (_, i) => `${i ? 'L' : 'M'}${-36 + i * 9} ${i % 2 ? -14 : 14}`).join(' ')} />
        {#each Array.from({ length: 8 }, (_, i) => i) as i (i)}<ellipse cx={-31.5 + i * 9} cy="0" rx="4.5" ry="14" stroke-width="1" opacity=".5" />{/each}
      {:else if body === 'tine'}
        <circle r={r * 0.9} stroke-width="4" />
      {/if}
    </g>
  {/if}
  <circle r={r * 0.2} fill="#cfd5df" stroke="rgba(0,0,0,.5)" />
  <circle r={r * 0.06} fill="#22262c" />

  <!-- its exciters, where their strands meet them -->
  {#if n > 1}
    {#if !showShapes}
      {#each shifts as p, i (i)}
        {@const t = (i / n) * 2 * Math.PI}
        <g transform="translate({Math.sin(t) * out} {-Math.cos(t) * out})">
          <circle r="10" fill="url(#{uid}-brass)" stroke="rgba(0,0,0,.5)" />
          <text text-anchor="middle" dy="3.5" font-size="9" font-weight="800" fill="#3a2806">{name(p)}</text>
        </g>
      {/each}
    {:else}
      {#if body === 'tine'}<circle r={r * 0.9} fill="none" stroke="#4a4f57" stroke-width="4" />{/if}
      {#each shifts as p, i (i)}
        {@const lit = i === 0 && ringing > 0}
        <g transform="rotate({(i / n) * 360})">
          {#if lit}<circle cy={-out} r="12" fill="#ffdc78" opacity=".5" filter="url(#{uid}-glow)" />{/if}
          {#if body === 'tine'}
            {@const len = Math.max(r * 0.35, r * 0.7 * by(p, 24))}
            <rect x="-4.5" y={-out} width="9" height={len} rx="4.5" fill="url(#{uid}-steel)" stroke="rgba(0,0,0,.5)" />
          {:else if body === 'bar'}
            {@const len = Math.max(r * 0.4, r * 0.75 * by(p, 24))}
            <rect x="-7" y={-out} width="14" height={len} rx="2" fill="url(#{uid}-wood)" stroke="rgba(0,0,0,.5)" />
            <circle cy={-out + len * 0.224} r="1.6" fill="#2a160a" /><circle cy={-out + len * 0.776} r="1.6" fill="#2a160a" />
          {:else if body === 'pipe'}
            {@const len = Math.max(r * 0.3, r * 0.85 * by(p, 12))}
            <rect x="-5.5" y={-out} width="11" height={len} rx="1.5" fill="url(#{uid}-pipe)" stroke="rgba(0,0,0,.5)" />
            <ellipse cy={-out} rx="5.5" ry="2" fill="#2c2b25" />
            <path d="M-4 {-out + len - 6} h8" stroke="#2c2b25" stroke-width="2" />
          {:else if body === 'wire'}
            <line y1={-out} y2={-r * 0.45} stroke="#efe0b4" stroke-width={3.6 - (p - low) / 12} />
            <rect x="-5" y={-r * 0.95} width="10" height="3" fill="#3a2a16" />
            <circle cy={-r * 0.45} r="2.5" fill="#8a8f98" />
          {:else if body === 'bell'}
            {@const s = 11 * by(p, 36)}
            <path d="M{-s} {-out + s * 0.9} Q{-s} {-out - s} 0 {-out - s} Q{s} {-out - s} {s} {-out + s * 0.9} Z" fill="url(#{uid}-brass)" stroke="rgba(0,0,0,.5)" />
            <line y1={-out + s * 0.9} y2={-r * 0.95} stroke="#6e5216" stroke-width="1.5" />
          {:else if body === 'fork'}
            {@const len = Math.max(r * 0.35, r * 0.6 * by(p, 24))}
            <path
              d="M0 {-r * 0.92} V{-out + len - 6} M-4 {-out} V{-out + len - 8} Q-4 {-out + len - 4} 0 {-out + len - 4} Q4 {-out + len - 4} 4 {-out + len - 8} V{-out}"
              fill="none"
              stroke="url(#{uid}-steel)"
              stroke-width="2.6"
              stroke-linecap="round"
            />
          {:else if body === 'plate'}
            {@const s = 9 * by(p, 36)}
            <rect x={-s} y={-out - s} width={s * 2} height={s * 2} fill="url(#{uid}-steel)" stroke="rgba(0,0,0,.5)" />
            <line y1={-out + s} y2={-r * 0.95} stroke="#6e737c" stroke-width="1.5" />
          {:else if body === 'box'}
            {@const s = 14 * by(p, 36)}
            <rect x={-s * 1.2} y={-out - s * 0.7} width={s * 2.4} height={s * 1.4} rx="3" fill="url(#{uid}-wood)" stroke="rgba(0,0,0,.5)" />
            <line x1={-s} x2={s} y1={-out} y2={-out} stroke="#2a160a" stroke-width="1.5" />
          {:else if body === 'spring'}
            {@const len = r * 0.45}
            <path d={Array.from({ length: 9 }, (_, k) => `${k ? 'L' : 'M'}${k % 2 ? -4 : 4} ${-out + (len * k) / 8}`).join(' ')} fill="none" stroke="#c8ced8" stroke-width="1.6" />
          {/if}
          {#if body !== 'wire'}
            <text y={-out - 3} text-anchor="middle" font-size="8" font-weight="800" fill="#e8e3d6" transform="rotate({-(i / n) * 360} 0 {-out - 6})" dy="-4">{name(p)}</text>
          {/if}
        </g>
      {/each}
    {/if}
  {/if}
</svg>
