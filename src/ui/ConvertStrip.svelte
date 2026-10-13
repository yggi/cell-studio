<script lang="ts">
  /**
   * Convert to cells, watched (#390): a strip along the bottom of the graph while it runs. A progress bar (moving to and
   * fro while the folder works, then the frame shown of the story's), what the frame did, the conversion's speed (a
   * slider, ¼× to 4×, logarithmic, kept in this browser), Skip to the end and Stop.
   */
  import { getStudio } from './state/studio.svelte';
  import { SPEEDS } from './state/convert.svelte';

  const studio = getStudio();
  const c = studio.conversion;
  const [lo, hi] = [Math.log2(SPEEDS.min), Math.log2(SPEEDS.max)];
  const label = (v: number) => (v >= 1 ? `${+v.toFixed(1)}×` : `${+v.toFixed(2)}×`);
</script>

{#if c.phase}
  <div class="strip" role="group" aria-label="Converting to cells">
    <div
      class="bar"
      class:busy={c.phase === 'folding'}
      role="progressbar"
      aria-label="Conversion"
      aria-valuemin="0"
      aria-valuemax={c.frames.length || undefined}
      aria-valuenow={c.phase === 'playing' ? c.frame + 1 : undefined}
    >
      <span style:width="{c.progress * 100}%"></span>
    </div>
    <div class="row">
      <p class="says" role="status">
        {#if c.phase === 'folding'}Folding the notes into cells…{:else}<span class="count">{c.frame + 1} / {c.frames.length}</span> {c.says}{/if}
      </p>
      <label class="speed">
        <span>Speed</span>
        <input
          type="range"
          min={lo}
          max={hi}
          step="0.01"
          value={Math.log2(c.speed)}
          aria-valuetext={label(c.speed)}
          oninput={(e) => c.setSpeed(2 ** Number(e.currentTarget.value))}
        />
        <output>{label(c.speed)}</output>
      </label>
      <button disabled={c.phase !== 'playing'} onclick={() => c.skip()}>Skip to end</button>
      <button onclick={() => studio.stopFolding()}>Stop</button>
    </div>
  </div>
{/if}

<style>
  .strip {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 4;
    display: grid;
    gap: 6px;
    padding: 0 var(--space-3) var(--space-2);
    background: var(--surface);
    border-top: 1px solid var(--line);
    font: 500 var(--text-sm) var(--font-ui);
    color: var(--text-muted);
  }
  .bar {
    height: 4px;
    margin: 0 calc(-1 * var(--space-3));
    background: var(--line);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width 400ms ease;
  }
  .bar.busy span {
    width: 30% !important;
    animation: to-and-fro 1.4s ease-in-out infinite alternate;
  }
  @keyframes to-and-fro {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(333%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bar.busy span {
      animation: none;
      width: 100% !important;
      opacity: 0.4;
    }
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .says {
    flex: 1 1 14rem;
    margin: 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
  }
  .count {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    margin-right: 6px;
  }
  .speed {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .speed input {
    width: 7rem;
    accent-color: var(--accent);
  }
  .speed output {
    min-width: 3.2em;
    font-variant-numeric: tabular-nums;
  }
  button {
    min-height: 32px;
    padding: 0 12px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font: 600 var(--text-sm) var(--font-ui);
    cursor: pointer;
  }
  button:disabled {
    color: var(--text-faint);
    cursor: default;
  }
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
