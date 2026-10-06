<script lang="ts">
  /**
   * Mock-ups for the design questions of #107, side by side: real wheels, each option a theme token or a style
   * changed for its column only (nothing in the app changes). `harness.html?mockups`, or
   * `node tools/wheels.mjs --fast --mockups` for a picture of each question.
   */
  import MockWheel from './MockWheel.svelte';
  import TokenWheel, { type WheelToken } from '../../src/ui/TokenWheel.svelte';

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

  // 2 · the playhead (it is the accent yellow, as live edges are)
  const q2: Option[] = [
    { label: 'A · accent yellow (now)', note: 'the same yellow as a live edge' },
    { label: 'B · white', note: 'reads on every note colour; edges stay yellow', vars: { '--wheel-hand': '#f4f6fb' } },
    { label: 'C · white, dark outline', note: 'white with a thin dark edge: also on pale notes', cls: 'outlined', vars: { '--wheel-hand': '#f4f6fb' } },
    { label: 'D · a notch at the rim', note: 'only the tip outside the ring, heavier: the ring stays unbroken', cls: 'notch' },
  ];

  // 3 · rest states: a one-step braid, a spectrum at rest
  const q3: Option[] = [
    { label: 'A · as now', note: 'a one-step braid is a solid ring; a spectrum at rest shows its partials, dark' },
    { label: 'B · quieter when stopped', note: 'stopped, every ring at half strength; it comes up when it plays', cls: 'quiet' },
    { label: 'C · a spectrum at rest lifted', note: 'its resting partials brighter, and a rim so the disc reads', cls: 'lifted' },
  ];

  // 4 · numbers in hubs and steps
  const q4: Option[] = [
    { label: 'A · raw (now)', note: 'the envelope’s four values as written; the steps to four decimals' },
    { label: 'B · units, rounded', note: 'the envelope in ms and %; the steps to two decimals', cls: 'hide-env' },
    { label: 'C · named', note: 'each value named on its stretch of the curve; the steps to three figures', cls: 'hide-env' },
    { label: 'D · none', note: 'the curve alone (values in the sheet and on hover); the steps unlabelled when they don’t fit', cls: 'hide-env' },
  ];
  const values = ['2.3429', '1.1047', '1.2224', '1.3501', '1.7346', '1.9168', '2.1191', '4'];
  const tokens = (fmt: (v: string) => string): WheelToken[] => values.map((v, i) => ({ label: fmt(v), hues: [(i * 45) % 360], weight: 1, kind: 'note' }));
  const tokenSets = [tokens((v) => v), tokens((v) => String(+(+v).toFixed(2))), tokens((v) => String(+(+v).toPrecision(3))), tokens(() => '')];
  // Acid-Cell's &fenv: adsr(0.003, 0.18, 0.1, 0.06)
  const envText = [null, ['3 ms · 180 ms', '10 % · 60 ms'], null, null];
  const envNamed = [
    { x: 0.2, y: 0.24, t: 'A 3 ms' },
    { x: 0.5, y: 0.42, t: 'D 180 ms' },
    { x: 0.62, y: 0.72, t: 'S 10 %' },
    { x: 0.86, y: 0.56, t: 'R 60 ms' },
  ];

  // 5 · a rest's colour (the same as the hub's now)
  const q5: Option[] = [
    { label: 'A · as the hub (now)', note: 'a rest and the hub are one grey' },
    { label: 'B · a gap', note: 'a rest is the disc showing through: nothing sounds there', vars: { '--wheel-rest': 'var(--wheel-disc)' } },
    { label: 'C · lighter', note: 'a rest a step lighter than the hub: a step you can see, quiet', vars: { '--wheel-rest': '#3a3f4d' } },
    { label: 'D · darker', note: 'a rest darker than the disc: a hole', vars: { '--wheel-rest': '#101217' } },
  ];
</script>

<main>
  <h1>Wheels · design questions (#107)</h1>
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

  <section data-mock="2-playhead">
    <h2>2 · The playhead: its own colour, or another mark?</h2>
    <div class="cols">
      {#each q2 as o (o.label)}
        <div class="col {o.cls ?? ''}" style={style(o.vars)}>
          <h3>{o.label}</h3>
          <p>{o.note}</p>
          <div class="row">
            {#each [{ piece: 'transpose', name: 'theme' }, { piece: 'acid', name: 'line' }] as w (w.name)}
              <div class="edged">
                <svg class="edges" viewBox="0 0 160 160" aria-hidden="true"><path d="M-10 30 C 60 40, 90 80, 170 70" /><path d="M20 170 C 50 100, 110 90, 150 -10" /></svg>
                <MockWheel piece={w.piece as 'transpose'} name={w.name} playing t={2.2} size={140} />
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section data-mock="3-rest-states">
    <h2>3 · Rest states: a one-step braid, a spectrum at rest</h2>
    <div class="cols">
      {#each q3 as o (o.label)}
        <div class="col {o.cls ?? ''}" style={style(o.vars)}>
          <h3>{o.label}</h3>
          <p>{o.note}</p>
          <div class="row tight">
            <MockWheel piece="forks" name="hits" />
            <MockWheel piece="rhythm" name="kick" />
          </div>
          <div class="row tight">
            <MockWheel piece="metronome" name="beatc" size={120} />
            <MockWheel piece="transpose" name="theme" />
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section data-mock="4-numbers">
    <h2>4 · Numbers in hubs and steps</h2>
    <div class="cols">
      {#each q4 as o, i (o.label)}
        <div class="col {o.cls ?? ''}" style={style(o.vars)}>
          <h3>{o.label}</h3>
          <p>{o.note}</p>
          <div class="row tight">
            <div class="env">
              <MockWheel piece="acid" name="fenv" size={160} />
              {#if envText[i]}<div class="envtext">{envText[i]![0]}<br />{envText[i]![1]}</div>{/if}
              {#if i === 2}{#each envNamed as n (n.t)}<span class="named" style:left="{n.x * 100}%" style:top="{n.y * 100}%">{n.t}</span>{/each}{/if}
            </div>
            <TokenWheel tokens={tokenSets[i]} size={176} hub={{ big: '8', small: 'grid' }} onpick={() => {}} onhub={() => {}} />
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section data-mock="5-rests">
    <h2>5 · A rest’s colour (it is the hub’s grey now)</h2>
    <div class="cols">
      {#each q5 as o (o.label)}
        <div class="col {o.cls ?? ''}" style={style(o.vars)}>
          <h3>{o.label}</h3>
          <p>{o.note}</p>
          <div class="row tight">
            <MockWheel piece="bossa" name="melody" size={170} />
          </div>
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
  /* 2 · the playhead: edges behind each wheel, as in the graph */
  .edged {
    position: relative;
    width: 160px;
    height: 160px;
    display: grid;
    place-items: center;
  }
  .edges {
    position: absolute;
    inset: 0;
    width: 160px;
    height: 160px;
  }
  .edges path {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    opacity: 0.9;
  }
  .edged :global(svg[data-wheel]) {
    position: relative;
  }
  .outlined :global(.hand line) {
    filter: drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000);
  }
  /* (at 140 px: the hand runs from 30.4 to 68.6 px out; the ring ends at 63: the notch is its last 14 px, half over the rim) */
  .notch :global(.hand line) {
    stroke-dasharray: 0 26.2 14 100;
    stroke-width: 6px !important;
    stroke-linecap: butt;
  }
  /* 3 · rest states */
  .quiet :global(svg[data-wheel='cell'] .rim) {
    opacity: 0.5;
  }
  .quiet :global([data-wheel='spectrum'] canvas) {
    opacity: 0.6;
  }
  .lifted :global([data-wheel='spectrum'] canvas) {
    filter: brightness(2.8) saturate(1.3);
  }
  .lifted :global([data-wheel='spectrum']) {
    box-shadow: inset 0 0 0 1.5px var(--wheel-tick);
  }
  /* 4 · numbers */
  .hide-env :global(svg[data-mode='curve'] text.small) {
    display: none;
  }
  .env {
    position: relative;
  }
  .envtext {
    position: absolute;
    left: 0;
    right: 0;
    top: 70%;
    text-align: center;
    font: 600 11px/1.3 var(--font-ui);
    color: var(--text-muted);
  }
  .named {
    position: absolute;
    transform: translate(-50%, -50%);
    font: 700 9.5px var(--font-ui);
    color: var(--text);
    white-space: nowrap;
    text-shadow: 0 0 3px var(--wheel-disc), 0 0 3px var(--wheel-disc);
  }
</style>
