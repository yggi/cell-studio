<script lang="ts">
  /** Sliders for the layout's main forces, a page of the sidebar. Changes apply live; Reset restores the defaults. */
  import type { LayoutOptions } from '../layout/options';

  type Key =
    | 'columnPull'
    | 'degreeRepel'
    | 'charge'
    | 'repelRange'
    | 'collidePad'
    | 'linkDistance'
    | 'partLength'
    | 'contract'
    | 'uncross'
    | 'rankPull'
    | 'centre'
    | 'straighten'
    | 'avoid'
    | 'tagPull'
    | 'tagRepel'
    | 'mux';
  let {
    options,
    onchange,
    onreset,
  }: {
    options: Readonly<LayoutOptions>;
    onchange: (key: Key, value: number) => void;
    onreset: () => void;
  } = $props();

  const groups: { title: string; rows: { key: Key; label: string; min: number; max: number; step: number; hint: string }[] }[] = [
    {
      title: 'nodes',
      rows: [
        { key: 'charge', label: 'repulsion', min: -900, max: 0, step: 10, hint: 'how hard nodes push their neighbours away' },
        { key: 'repelRange', label: 'repulsion range', min: 80, max: 900, step: 10, hint: 'how far the push reaches (px)' },
        { key: 'degreeRepel', label: 'busy push', min: 0, max: 0.6, step: 0.01, hint: 'nodes with more edges push harder: × (1 + this × (edges − 1))' },
        { key: 'collidePad', label: 'label room', min: 0, max: 80, step: 1, hint: 'clearance around each wheel (px)' },
      ],
    },
    {
      title: 'edges',
      rows: [
        { key: 'linkDistance', label: 'length', min: 40, max: 320, step: 5, hint: 'edge length at rest (px)' },
        { key: 'partLength', label: 'part length', min: 0.2, max: 1.5, step: 0.05, hint: 'edges from parts and tables to their user, as a share of the length' },
        { key: 'contract', label: 'contraction', min: 0, max: 1, step: 0.05, hint: 'how much edges pull towards that length' },
        { key: 'uncross', label: 'crossing push', min: 0, max: 2, step: 0.05, hint: 'how hard crossing edges push apart' },
        { key: 'straighten', label: 'straightening', min: 0.02, max: 1, step: 0.01, hint: 'how quickly a bent edge straightens' },
        { key: 'avoid', label: 'off node centres', min: 0, max: 2, step: 0.05, hint: 'how far edges keep off a node’s centre (× radius)' },
      ],
    },
    {
      title: 'order',
      rows: [
        { key: 'rankPull', label: 'flow order', min: 0, max: 0.3, step: 0.01, hint: 'pull to the height of each node’s rank in the signal path' },
        {
          key: 'columnPull',
          label: 'columns',
          min: 0,
          max: 0.2,
          step: 0.005,
          hint: 'a gentle pull to each node’s column: voices by stereo and mix order, cells over the voices they feed',
        },
        { key: 'centre', label: 'centring', min: 0, max: 0.1, step: 0.005, hint: 'a weak sideways pull to the centre line, for nodes without a column' },
      ],
    },
    {
      title: 'clusters',
      rows: [
        { key: 'tagPull', label: 'cluster pull', min: 0, max: 0.6, step: 0.01, hint: 'cells with the same tag drawn to their cluster’s middle' },
        { key: 'tagRepel', label: 'cluster push', min: 0, max: 8, step: 0.1, hint: 'clusters pushed apart' },
        {
          key: 'mux',
          label: 'hubs pull clusters',
          min: 0,
          max: 1,
          step: 0.05,
          hint: 'how much of a hub’s pull on a cluster’s cells (the meter, a selector, a mix) moves the cluster as one instead',
        },
      ],
    },
  ];
  const fmt = (v: number) => (Math.abs(v) >= 10 ? String(Math.round(v)) : v.toFixed(2));
</script>

<div class="panel">
  {#each groups as g (g.title)}
    <section>
      <h4>{g.title}</h4>
      {#each g.rows as r (r.key)}
        <label title={r.hint}>
          <span class="name">{r.label}</span>
          <input type="range" min={r.min} max={r.max} step={r.step} value={options[r.key]} oninput={(e) => onchange(r.key, +e.currentTarget.value)} />
          <output>{fmt(options[r.key])}</output>
        </label>
      {/each}
    </section>
  {/each}
  <button class="reset" onclick={onreset}>Reset to defaults</button>
</div>

<style>
  .panel {
    display: grid;
    gap: 12px;
  }
  section {
    display: grid;
    gap: 2px;
    padding: 10px 12px 8px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--code-bg);
  }
  h4 {
    margin: 0 0 4px;
    font: 700 12px var(--font-ui);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text);
  }
  label {
    display: grid;
    grid-template-columns: 6.5em minmax(0, 1fr) 3em;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    font-size: 13px;
  }
  .name {
    color: var(--text-muted);
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }
  output {
    text-align: right;
    font: 600 12px var(--font-code);
    color: var(--text-muted);
  }
  .reset {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 600 13px var(--font-ui);
    cursor: pointer;
  }
  .reset:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
