<script lang="ts">
  /**
   * A module's rim (decision 069, #560): its accent ring and its jacks, over the wheel that draws it. Each jack in use is a
   * dot on the rim, over the lower half in its signature's order, drawn by what it holds (filled: a cable; a ring with a
   * dot: a value set on the line; a knob, its pointer at the default), and a handle (`jack-<port>`) where a wire into it ends
   * (layout/modules.ts: which jack a wire fills; ui/Graph.svelte's `head`: where).
   */
  import { Handle, Position } from '@xyflow/svelte';
  import type { Jack } from '@yggi/cells/engine/patch';
  import { jackAt, jackHandle, jacksShown } from '../layout/modules';

  let { size, jacks, module }: { size: number; jacks: readonly Jack[]; module: string } = $props();
  const shown = $derived(jacksShown(jacks));
  const R = $derived(size / 2);
  const DOT = 7;
  /** A knob's pointer: its default as a share, where it reads as one (`map=lin .5`, `.3`); else straight up. */
  const shareOf = (knob: string | null): number => {
    const m = /(-?\d*\.?\d+)\s*$/.exec(knob ?? '');
    const v = m ? Number(m[1]) : NaN;
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.5;
  };
  const pointer = (v: number) => Math.PI * (0.75 + 1.5 * v);
</script>

<svg class="rim" width={size + 2 * DOT + 4} height={size + 2 * DOT + 4} style:left="{-DOT - 2}px" style:top="{-DOT - 2}px" aria-hidden="true">
  <g transform="translate({R + DOT + 2},{R + DOT + 2})">
    <circle class="ring" r={R} />
    {#each shown as j, i (j.port)}
      {@const p = jackAt(i, shown.length, size)}
      <g transform="translate({p.x},{p.y})" class="jack {j.band}" data-port={j.port}>
        {#if j.patched.length}
          <circle r={DOT} class="cable" />
        {:else if /^&\(|map=adsr/.test(j.knob ?? '')}
          <circle r={DOT} class="set" />
          <circle r={DOT - 4} class="cable" />
        {:else}
          <circle r={DOT} class="knob" />
          <line x1="0" y1="0" x2={Math.cos(pointer(shareOf(j.knob))) * DOT} y2={Math.sin(pointer(shareOf(j.knob))) * DOT} />
        {/if}
        <title>{module}'s {j.port}: {j.patched.length ? j.patched.map((c) => `&${c}`).join(', ') : `${j.knob} (its knob)`}</title>
      </g>
    {/each}
  </g>
</svg>
{#each shown as j, i (j.port)}
  {@const p = jackAt(i, shown.length, size)}
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
