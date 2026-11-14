<script lang="ts">
  /**
   * A fragment heard alone, pictured by its facet (#623, `layout/preview.ts`): what its host plays as the facet reads
   * best (a drum grid, a roll, its sections, the keys, a meter's ticks, its roles), and what it reads, each optional
   * parameter at its default (a knob, a style's sliders, the text as written). Over the graph, under the fragment's strip.
   */
  import { getStudio } from './state/studio.svelte';
  import { heardOf } from '../compile';
  import { controlsOf, pictureOf } from '../layout/preview';

  const { piece } = getStudio();
  const W = 300;
  const H = 84;
  const heard = $derived(heardOf(piece.program));
  const picture = $derived(pictureOf(piece.fragment?.facets ?? [], piece.code, heard.notes, heard.bar));
  const controls = $derived(controlsOf(piece.code));
  const BLACK = new Set([1, 3, 6, 8, 10]);
  const whites = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((m) => !BLACK.has(m % 12));
  // (a knob's pointer: from 7 o'clock, 0, round to 5 o'clock, 1)
  const pointer = (v: number, r: number) => {
    const a = Math.PI * (0.75 + 1.5 * v);
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  };
</script>

{#if piece.fragment && (picture.kind !== 'none' || controls.length)}
  <div class="preview" role="figure" aria-label="{piece.fragment.id}, pictured as a {piece.fragment.facets[0] ?? 'fragment'}" data-picture={picture.kind}>
    {#if picture.kind !== 'none'}
      <svg width={W} height={H} viewBox="0 0 {W} {H}" aria-hidden="true">
        {#if picture.kind === 'grid'}
          {@const rh = Math.min(16, H / Math.max(1, picture.rows.length))}
          {#each picture.rows as row, r (row.voice)}
            <text x="0" y={r * rh + rh * 0.72} class="lab">{row.voice}</text>
            {#each row.slots as v, i (i)}
              <rect x={56 + i * ((W - 56) / 16)} y={r * rh + 1} width={(W - 56) / 16 - 2} height={rh - 2} rx="2" class="step" opacity={v ? 0.3 + 0.7 * v : 0.1} />
            {/each}
          {/each}
        {:else if picture.kind === 'roll'}
          {#each picture.notes as n, i (i)}
            <rect x={n.x * W} y={(1 - n.y) * (H - 6)} width={Math.max(2, n.w * W - 1)} height="6" rx="2" class="note" />
          {/each}
        {:else if picture.kind === 'sections'}
          {@const w = W / picture.sections.length}
          {#each picture.sections as s, i (i)}
            <rect x={i * w + 2} y="16" width={w - 4} height="44" rx="6" class="section" opacity={1 - 0.2 * (s.letter.charCodeAt(0) - 65)} />
            <text x={i * w + w / 2} y="43" class="lab mid ink">{s.letter}</text>
            <text x={i * w + w / 2} y="76" class="lab mid">{s.name}</text>
          {/each}
        {:else if picture.kind === 'keys'}
          {@const ws = whites(picture.lo, picture.hi)}
          {@const kw = W / ws.length}
          {#each ws as m, i (m)}
            <rect x={i * kw + 1} y="4" width={kw - 2} height={H - 8} rx="2" class="white" class:lit={picture.lit.includes(m)} />
          {/each}
          {#each ws as m, i (m)}
            {#if BLACK.has((m + 1) % 12) && m + 1 <= picture.hi}
              <rect x={(i + 1) * kw - kw * 0.3} y="4" width={kw * 0.6} height={(H - 8) * 0.6} rx="2" class="black" class:lit={picture.lit.includes(m + 1)} />
            {/if}
          {/each}
        {:else if picture.kind === 'ticks'}
          {#each picture.ticks as t, i (i)}
            <line x1={6 + t.x * (W - 12)} x2={6 + t.x * (W - 12)} y1={t.strong ? 10 : 34} y2={H - 10} class="tick" class:strong={t.strong} />
          {/each}
        {:else if picture.kind === 'roles'}
          {@const cols = Math.min(3, picture.roles.length)}
          {#each picture.roles as role, i (role)}
            <rect x={(i % cols) * (W / cols) + 2} y={Math.floor(i / cols) * 26 + 2} width={W / cols - 4} height="22" rx="11" class="role" />
            <text x={(i % cols) * (W / cols) + W / cols / 2} y={Math.floor(i / cols) * 26 + 17} class="lab mid">&{role}</text>
          {/each}
        {/if}
      </svg>
    {/if}
    {#if controls.length}
      <div class="controls">
        {#each controls as c (c.name)}
          {#if c.kind === 'knob'}
            {@const p = pointer(c.value, 11)}
            <span class="control" title="&{c.name}: {c.value} by default">
              <svg width="28" height="28" viewBox="-14 -14 28 28" aria-hidden="true"><circle r="12" class="knob" /><line x2={p.x} y2={p.y} class="pointer" /></svg>
              &{c.name} <span class="faint">{c.value}</span>
            </span>
          {:else if c.kind === 'sliders'}
            {#each c.axes as a (a.axis)}
              <span class="control slider" title="&{c.name}[{a.axis}]: {a.value} by default"
                >&{c.name}[{a.axis}] <span class="track"><span class="thumb" style:left="{a.value * 100}%"></span></span></span
              >
            {/each}
          {:else}
            <span class="control" title="&{c.name}, by default">&{c.name} <code>{c.text}</code></span>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .preview {
    position: absolute;
    top: 52px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 4;
    width: min(332px, calc(100% - 32px));
    display: grid;
    gap: 8px;
    padding: 10px 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    font: 13px var(--font-ui);
    color: var(--text);
  }
  svg {
    max-width: 100%;
    height: auto;
  }
  .lab {
    fill: var(--text-muted);
    font: 11px var(--font-code);
  }
  .mid {
    text-anchor: middle;
  }
  .ink {
    fill: var(--accent-ink);
    font-weight: 700;
    font-size: 15px;
  }
  .step,
  .note,
  .section,
  .lit {
    fill: var(--accent);
  }
  .white {
    fill: var(--text);
  }
  .black {
    fill: var(--code-bg);
  }
  .white.lit,
  .black.lit {
    fill: var(--accent);
  }
  .tick {
    stroke: var(--text-muted);
    stroke-width: 2;
  }
  .tick.strong {
    stroke: var(--accent);
    stroke-width: 3;
  }
  .role {
    fill: none;
    stroke: var(--accent);
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    align-items: center;
  }
  .control {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-code);
    font-size: 12px;
  }
  .control code {
    color: var(--text-muted);
  }
  .faint {
    color: var(--text-muted);
  }
  .knob {
    fill: var(--code-bg);
    stroke: var(--line);
  }
  .pointer {
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .track {
    position: relative;
    display: inline-block;
    width: 64px;
    height: 4px;
    border-radius: 2px;
    background: var(--line);
  }
  .thumb {
    position: absolute;
    top: -4px;
    width: 12px;
    height: 12px;
    margin-left: -6px;
    border-radius: 50%;
    background: var(--accent);
  }
</style>
