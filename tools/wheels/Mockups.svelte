<script lang="ts">
  /**
   * Mock-ups for design questions, side by side: real wheels, each option a theme token or a style changed for its
   * column only (nothing in the app changes). #107 asked five; four are decided and in the app (a white playhead
   * with a dark edge, a spectrum at rest lifted, an envelope's values named, rests as they were), the
   * turntables' and the sun's look is still open. `harness.html?mockups`, or
   * `node tools/wheels.mjs --fast --mockups` for a picture of each question.
   */
  import MockWheel from './MockWheel.svelte';

  type Option = { label: string; note: string; cls?: string; vars?: Record<string, string> };
  const style = (vars?: Record<string, string>) => (vars ? Object.entries(vars).map(([k, v]) => `${k}: ${v}`).join('; ') : '');

  // 1 · turntables and the sun: physical, or flat like the other wheels
  const flatTinted = {
    '--disc-belt-0': '#4a3b2f', '--disc-belt-1': '#4a3b2f', '--disc-belt-2': '#4a3b2f',
    '--disc-motor-0': '#353a47', '--disc-motor-1': '#353a47', '--disc-motor-2': '#353a47',
    '--disc-tape-0': '#2c3038', '--disc-tape-1': '#2c3038', '--disc-tape-2': '#2c3038',
    '--disc-resonator-0': '#9c7a35', '--disc-resonator-1': '#9c7a35', '--disc-resonator-2': '#9c7a35',
    '--axle-0': '#d7dbe6', '--axle-1': '#d7dbe6', '--axle-2': '#d7dbe6',
    '--sky-day': '#2c3a52', '--sky-dusk': '#2c3a52', '--sky-dusk-night': '#1b1e27', '--sky-night': '#1b1e27',
  };
  const flatWheel = Object.fromEntries(Object.keys(flatTinted).map((k) => [k, k.startsWith('--axle') ? 'var(--text-muted)' : k.startsWith('--sky-d') && !k.endsWith('night') ? 'var(--wheel-hub)' : 'var(--wheel-disc)']));
  const q1: Option[] = [
    { label: 'A · physical (now)', note: 'wood, chrome, brass, a sky: things you can touch look touchable' },
    { label: 'B · flat, tinted', note: 'one flat colour per material, no gradients or drop shadows; the role still reads' },
    { label: 'C · flat, wheel colours', note: 'the wheels’ own disc and hub colours: one family with the cell wheels', cls: 'flat', vars: flatWheel },
  ];
  q1[1].vars = flatTinted;
  q1[1].cls = 'flat';

</script>

<main>
  <h1>Wheels · design questions</h1>
  <p class="meta">Real wheels from the examples; each column changes one thing for itself only. Pick per question (or none).</p>

  <section data-mock="1-visual-language">
    <h2>1 · Turntables and the sun: physical, or flat like the rest?</h2>
    <div class="cols">
      {#each q1 as o (o.label)}
        <div class="col {o.cls ?? ''}" style={style(o.vars)}>
          <h3>{o.label}</h3>
          <p>{o.note}</p>
          <div class="row tight">
            <MockWheel piece="tape" name="hats" />
            <MockWheel piece="musicbox" name="bar" />
          </div>
          <div class="row tight">
            <MockWheel piece="fiveto12" name="memory" />
            <MockWheel piece="forks" name="forkA" />
          </div>
          <div class="row tight"><MockWheel piece="fiveto12" name="sun" /><MockWheel piece="transpose" name="key" size={128} /></div>
        </div>
      {/each}
    </div>
  </section>

</main>

<style>
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
  }
  main {
    padding: 20px 24px 40px;
    font-family: var(--font-ui);
  }
  h1 {
    font-size: 20px;
    margin: 0 0 4px;
  }
  .meta {
    color: var(--text-muted);
    font-size: 13px;
    margin: 0;
  }
  section {
    margin-top: 22px;
    padding: 14px 16px 18px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  h2 {
    font-size: 16px;
    margin: 0 0 12px;
  }
  .cols {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .col {
    background: var(--bg);
    border-radius: var(--radius);
    padding: 10px 12px 14px;
  }
  h3 {
    font: 700 13px var(--font-code);
    color: var(--accent);
    margin: 0 0 2px;
  }
  .col p {
    font-size: 12px;
    color: var(--text-muted);
    margin: 0 0 10px;
    min-height: 32px;
  }
  .row {
    display: flex;
    gap: 14px;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }
  .row.tight {
    gap: 6px;
  }
  /* 1 · flat: no gradient shading or drop shadows on the physical wheels */
  .flat :global(.turntable),
  .flat :global(.sun) {
    filter: none !important;
    box-shadow: none !important;
  }
  .flat :global(.turntable .tick),
  .flat :global(.turntable .groove) {
    opacity: 0.4;
  }
</style>
