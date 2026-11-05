<script lang="ts">
  /**
   * A wheel's jacks (decision 069, #560), over the wheel that draws it: a module's, a voice's or an instrument's. Its rim
   * in the accent: a circle (`ring`: a module, an instrument, a cell), or a voice's own outline (`band`: its disc and its
   * envelope's band, layout/voice.ts). Each jack in use is a dot, over the lower half of a ring in its signature's order,
   * or in a row along a voice's band, drawn by what it holds (filled: a cable; a ring with a dot: a value set on the line;
   * a knob, its pointer at its default), and a handle (`jack-<port>`) where a wire into it ends (layout/modules.ts: which
   * jack a wire fills; ui/Graph.svelte's `head`: where).
   */
  import { Handle, Position } from '@xyflow/svelte';
  import type { Jack } from '@yggi/cells/engine/patch';
  import { jackAt, jackHandle, jacksShown, type JackShape } from '../layout/modules';
  import { voiceOutline } from '../layout/voice';

  let { size, jacks, label, shape }: { size: number; jacks: readonly Jack[]; label: string; shape: JackShape } = $props();
  const shown = $derived(jacksShown(jacks));
  const R = $derived(size / 2);
  const DOT = 7;
  // (the voice's outline reaches to its band's bottom: the svg as tall as that, and its dots under it)
  const tall = $derived(shape === 'band' ? size * 1.8 : size);
  /** A knob's pointer: its default as a share, where it reads as one (`map=lin .5`, `.3`); else straight up. */
  const shareOf = (knob: string | null): number => {
    const m = /(-?\d*\.?\d+)\s*$/.exec(knob ?? '');
    const v = m ? Number(m[1]) : NaN;
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.5;
  };
  const pointer = (v: number) => Math.PI * (0.75 + 1.5 * v);
  /** A value written on the line, not a knob: an unnamed cell (`&( … )`) or an envelope given in place. */
  const isSet = (knob: string | null) => /^&\(|map=adsr/.test(knob ?? '');
</script>

<svg class="rim" width={size + 2 * DOT + 4} height={tall + 2 * DOT + 4} style:left="{-DOT - 2}px" style:top="{-DOT - 2}px" aria-hidden="true">
  <g transform="translate({DOT + 2},{DOT + 2})">
    {#if shape === 'band'}
      <path class="ring" d={voiceOutline(size)} />
    {:else}
      <circle class="ring" cx={R} cy={R} r={R} />
    {/if}
    {#each shown as j, i (j.port)}
      {@const p = jackAt(i, shown.length, size, shape)}
      <g transform="translate({R + p.x},{R + p.y})" class="jack {j.band}" data-port={j.port}>
        {#if j.patched.length}
          <circle r={DOT} class="cable" />
        {:else if isSet(j.knob)}
          <circle r={DOT} class="set" />
          <circle r={DOT - 4} class="cable" />
        {:else}
          <circle r={DOT} class="knob" />
          <line x1="0" y1="0" x2={Math.cos(pointer(shareOf(j.knob))) * DOT} y2={Math.sin(pointer(shareOf(j.knob))) * DOT} />
        {/if}
        <title>{label}'s {j.port}: {j.patched.length ? j.patched.map((c) => `&${c}`).join(', ') : `${j.knob} (${isSet(j.knob) ? 'set on its line' : 'its knob'})`}</title>
      </g>
    {/each}
  </g>
</svg>
{#each shown as j, i (j.port)}
  {@const p = jackAt(i, shown.length, size, shape)}
  <Handle type="target" id={jackHandle(j.port)} position={Position.Bottom} class="jack-handle" style="left: {R + p.x}px; top: {R + p.y}px" isConnectable={false} />
{/each}

<style>
  .rim {
    position: absolute;
    pointer-events: none;
    overflow: visible;
  }
  .ring {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
  }
  .jack .cable {
    fill: var(--text-muted);
    stroke: var(--bg);
    stroke-width: 2;
  }
  .jack.audio .cable {
    fill: var(--accent);
  }
  .jack .set {
    fill: var(--bg);
    stroke: var(--text-muted);
    stroke-width: 3;
  }
  .jack .knob {
    fill: var(--surface-2);
    stroke: var(--text-muted);
    stroke-width: 2;
  }
  .jack line {
    stroke: var(--text);
    stroke-width: 2;
  }
  :global(.jack-handle) {
    opacity: 0;
  }
</style>
