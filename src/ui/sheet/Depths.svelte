<script lang="ts">
  /**
   * A cable's depth (#598): each moving parameter whose range cells scale (`lpf=70..4800 * &eg`), its two ends as sliders,
   * from and to, a frequency on a log scale (layout/depth.ts). A cable patched at zero depth (`lpq=8..8 * &wob`) is
   * heard once its ends move apart. Each move rewrites the line, its cells kept (cells' attrValue/setAttr, yggi/cells#470).
   */
  import Section from './Section.svelte';
  import { depthsOf, formatEnd, positionOf, setDepth, valueAt, type Depth } from '../../layout/depth';

  let { name, source, onedit }: { name: string; source: string; onedit: (source: string) => void } = $props();

  const depths = $derived(depthsOf(source, name));
  const STEPS = 1000;
  const at = (v: number, d: Depth) => Math.round(positionOf(v, d.span) * STEPS);
  const move = (d: Depth, end: 'lo' | 'hi', i: number) => {
    const v = valueAt(i / STEPS, d.span);
    onedit(setDepth(source, name, d, end === 'lo' ? v : d.lo, end === 'hi' ? v : d.hi));
  };
</script>

{#if depths.length}
  <Section title="Cables">
    {#each depths as d (d.key)}
      <div class="depth" data-key={d.key}>
        <p class="what">
          <code>{d.key}</code>
          <span class="range">{formatEnd(d.lo, d.span)}..{formatEnd(d.hi, d.span)}</span>
          <span class="by">× {d.factors.join(' × ')}</span>
          {#if d.lo === d.hi}<span class="zero">at zero depth: move its ends apart to hear it</span>{/if}
        </p>
        {#each ['lo', 'hi'] as const as end (end)}
          <label class="end">
            <span>{end === 'lo' ? 'from' : 'to'}</span>
            <input
              type="range"
              min="0"
              max={STEPS}
              step="1"
              value={at(end === 'lo' ? d.lo : d.hi, d)}
              aria-label="&{name}'s {d.key}, {end === 'lo' ? 'from' : 'to'}"
              aria-valuetext={formatEnd(end === 'lo' ? d.lo : d.hi, d.span)}
              oninput={(e) => move(d, end, +e.currentTarget.value)}
            />
          </label>
        {/each}
      </div>
    {/each}
  </Section>
{/if}

<style>
  .depth {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .what {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
    margin: 0;
    font-size: 13px;
    color: var(--text);
  }
  .by,
  .zero {
    color: var(--text-muted);
  }
  .end {
    display: grid;
    grid-template-columns: 3em 1fr;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-muted);
  }
  /* (a finger's target: 44 px tall, decision 069 §6) */
  .end input {
    width: 100%;
    height: 44px;
    margin: 0;
    accent-color: var(--accent);
  }
</style>
