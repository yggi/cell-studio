<script lang="ts">
  /**
   * Mock-ups for design questions, side by side: real wheels, each option a theme token or a style changed for its
   * column only (nothing in the app changes). #107 asked five; four are decided and in the app (a white playhead
   * with a dark edge, a spectrum at rest lifted, an envelope's values named, rests as they were), the
   * turntables' and the sun's look is still open. `harness.html?subject=mockups`, or
   * `node tools/gallery.mjs mockups` for a picture of each question.
   */
  import MockWheel from './MockWheel.svelte';
  import BodyMock from './BodyMock.svelte';
  import { compilePiece } from '../../../src/compile';
  import { EXAMPLES, type ExampleKey } from '@yggi/cells';
  import MeterMock from './MeterMock.svelte';
  import { sectionTint } from '../../../src/ui/theme';

  type Option = { label: string; note: string; cls?: string; vars?: Record<string, string> };
  const style = (vars?: Record<string, string>) =>
    vars
      ? Object.entries(vars)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ')
      : '';

  // 1 · turntables and the sun: physical, or flat like the other wheels
  const flatTinted = {
    '--disc-belt-0': '#4a3b2f',
    '--disc-belt-1': '#4a3b2f',
    '--disc-belt-2': '#4a3b2f',
    '--disc-motor-0': '#353a47',
    '--disc-motor-1': '#353a47',
    '--disc-motor-2': '#353a47',
    '--disc-tape-0': '#2c3038',
    '--disc-tape-1': '#2c3038',
    '--disc-tape-2': '#2c3038',
    '--disc-resonator-0': '#9c7a35',
    '--disc-resonator-1': '#9c7a35',
    '--disc-resonator-2': '#9c7a35',
    '--axle-0': '#d7dbe6',
    '--axle-1': '#d7dbe6',
    '--axle-2': '#d7dbe6',
  };
  const flatWheel = Object.fromEntries(Object.keys(flatTinted).map((k) => [k, k.startsWith('--axle') ? 'var(--text-muted)' : 'var(--wheel-disc)']));
  const q1: Option[] = [
    { label: 'A · physical (now)', note: 'wood, chrome, brass, a sky: things you can touch look touchable' },
    { label: 'B · flat, tinted', note: 'one flat colour per material, no gradients or drop shadows; the role still reads' },
    { label: 'C · flat, wheel colours', note: 'the wheels’ own disc and hub colours: one family with the cell wheels', cls: 'flat', vars: flatWheel },
  ];
  q1[1].vars = flatTinted;
  q1[1].cls = 'flat';

  // 2 · a resonator's body: each body= with exciters as the examples write it (most: one)
  const bodies: { body: string; shifts: number[]; seen: string }[] = [
    { body: 'fork', shifts: [0], seen: 'Two Tuning Forks, Sympathy, Five to 12 (6×, one exciter)' },
    { body: 'bell', shifts: [0, 3, 7, 12], seen: 'none yet (a chime set)' },
    { body: 'bar', shifts: [0, 2, 4, 7, 9], seen: 'Resonanz (&girder, one); a marimba' },
    { body: 'plate', shifts: [0], seen: 'Resonanz (&plate, one)' },
    { body: 'box', shifts: [0, 5, 7], seen: 'none (every board=box: the shared board)' },
    { body: 'tine', shifts: [0, 2, 4, 7, 9, 12], seen: 'Kalimba, golden (built: #302)' },
    { body: 'pipe', shifts: [0, 7, 12], seen: 'Harmonograph (2×, one, excite=)' },
    { body: 'wire', shifts: [0, 7, 12, 19], seen: 'Resonanz, Sympathy (strings 0 7 12 19), Harmonograph' },
    { body: 'spring', shifts: [0], seen: 'Resonanz (&spring, one)' },
  ];
  const q2 = [
    { option: 'now', label: 'A · now', note: 'brass disc, mode rings; brass pads round it when more than one exciter' },
    { option: 'shape', label: 'B · exciters take the body', note: 'each exciter drawn as its body’s element where its pad is, out to its strand (the tines, for all)' },
    { option: 'face', label: 'C · B + the body on its face', note: 'the body engraved on the disc: what a single exciter, the usual case, shows' },
    { option: 'material', label: 'D · C + its material', note: 'the disc of the body’s material: steel, wood, brass, organ metal' },
    { option: 'material', label: 'D · ringing', note: 'the moving part ghosted, the struck exciter glowing', ringing: 1 },
  ] as const;

  // 3 · &bar as one wheel (#701): each a real example's compiled meter
  const meterOf = (piece: ExampleKey, name = 'bar') => {
    const r = compilePiece(EXAMPLES[piece].source);
    if (!r.ok) throw new Error(`${piece} does not compile`);
    const c = r.cells.get(name)!;
    const m = c.meter!;
    const sw = m.swing?.[0];
    return {
      beats: m.beats as number[],
      levels: m.levels as number[],
      unit: m.unit,
      swing: sw ? { whole: sw.whole, share: sw.share } : null,
      bpm: Math.round(((r.clocks.get(name)?.perSecond ?? 0) * 60) / c.beat),
    };
  };
  const sections = [
    { name: 'intro', bar: 0, turn: 0.12 },
    { name: 'verse', bar: 4, turn: 0.4 },
    { name: 'chorus', bar: 8, turn: 0.62 },
    { name: 'end', bar: 12, turn: 0.88 },
  ];
  const q3: { label: string; note: string; meter: ReturnType<typeof meterOf> }[] = [
    { label: 'A · straight', note: 'Metronome: 4/4, no swing=, no ring', meter: meterOf('metronome') },
    { label: 'B · swing=8n:2/3', note: 'Swing: the eighths in pairs, long and short; the beats and bar line never move', meter: meterOf('swing') },
    { label: 'C · swing=16n:.58', note: 'Funk: the sixteenths in pairs, two to a beat', meter: meterOf('funk') },
    { label: 'D · 2+2+3 at 8n:.6', note: 'Aksak: the pulses are eighths, so they lean themselves; the three stays even', meter: meterOf('aksak') },
    { label: 'E · 5/4', note: 'Five: five beats, a bar of five pulses, the swing on each', meter: meterOf('five') },
    { label: 'F · 12/8', note: 'Twelve: 4 beats of three; a group of three leans nothing, no swing=', meter: meterOf('twelve') },
  ];
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
          <div class="row tight"><MockWheel piece="fiveto12" name="day" /><MockWheel piece="transpose" name="key" size={128} /></div>
        </div>
      {/each}
    </div>
  </section>

  <section data-mock="3-meter-wheel">
    <h2>3 · &amp;bar as one wheel: tempo, meter, swing (#701)</h2>
    <p class="meta">
      The clock's white (<code>--meter-0</code>, the app's own colour for a meter), not a hue: hues on a wheel are pitches and voices. <b>Pulses</b> stand on the hub's side, as
      tall as their sync level is strong (the bar's first reaches the rim, as an accent on a drum machine);
      <b>beats</b> are the arc outside them, as long as their pulses, numbered on the rim; the <b>swing ring</b> inside is the swung level's pairs, long then short (a group that isn't
      a pair stays even). Each from a real example's compiled meter. Top row 1:1 (148 px), below 2×. No handle: the share is set in the cell's details (section 5).
    </p>
    <div class="swings">
      {#each q3 as o (o.label)}
        <div class="swing">
          <h3>{o.label}</h3>
          <p>{o.note}</p>
          <MeterMock {...o.meter} />
          <div class="big"><MeterMock {...o.meter} size={300} /></div>
        </div>
      {/each}
    </div>
  </section>

  <section data-mock="4-meter-running">
    <h2>4 · &amp;bar running: the wheel stays, the hand is the playhead, a turn a bar</h2>
    <p class="meta">
      Time is even round the wheel, so the hand's speed is the tempo over the bar and a swung pair is a long arc then a short one: the hand takes longer through the long. The pulse
      under the hand is lit (full height, outlined) and so is its beat. Swing piece (4/4, 8n:2/3) and Aksak (2+2+3, 8n:.6, where the pulses themselves lean) at six moments of a
      bar; funk (16n:.58) below.
    </p>
    <div class="strip">
      {#each [0.02, 0.2, 0.3, 0.55, 0.72, 0.93] as t (t)}<MeterMock {...meterOf('swing')} turn={t} size={148} />{/each}
    </div>
    <div class="strip">
      {#each [0.02, 0.22, 0.34, 0.5, 0.7, 0.9] as t (t)}<MeterMock {...meterOf('aksak')} turn={t} size={148} />{/each}
    </div>
    <div class="strip">
      {#each [0.02, 0.07, 0.14, 0.2, 0.28, 0.45] as t (t)}<MeterMock {...meterOf('funk')} turn={t} size={148} />{/each}
    </div>
  </section>

  <section data-mock="5-meter-details">
    <h2>5 · Swing is set in the details, like the meter's other attributes</h2>
    <p class="meta">
      The cell's sheet (Settings) as the app lays out an attribute: its name, its value as written, its control; here a share between the attribute's own range, 1/2 straight, 2/3
      the triplet as a detent.
    </p>
    <div class="details">
      <MeterMock {...meterOf('swing')} size={220} />
      <dl>
        <div>
          <dt>tempo</dt>
          <dd><code>step=&amp;tempo</code> <span>160 bpm</span></dd>
        </div>
        <div>
          <dt>meter</dt>
          <dd><code>meter("4/4")</code> <span>4 beats of 1 pulse</span></dd>
        </div>
        <div>
          <dt>swing</dt>
          <dd>
            <code>swing=8n:2/3</code>
            <span class="slider"><i style="left: 66.7%"></i><b style="left: 0%">1/2</b><b style="left: 66.7%">2/3</b><b style="left: 100%">3/4</b></span>
          </dd>
        </div>
      </dl>
    </div>
  </section>

  <section data-mock="6-meter-selector">
    <h2>6 · A selector's clock keeps its hue</h2>
    <p class="meta">
      Where a meter steps a selector (Arrangement: &amp;song picks the intro, verse, chorus and end, four bars each), the tower's loom tints the clock the playing section's colour,
      one white in and its spectrum out (<code>sectionTint</code>). The wheel does the same while that section plays: its pulses, beats and swing take the tint; the hub says the
      bar it is in, 1, 5, 9 and 13 (a bar is a lap, a section four bars). Stopped, or with no selector, it is the clock's white.
    </p>
    <div class="strip">
      {#each sections as sec, k (sec.name)}
        <figure>
          <MeterMock {...meterOf('arrangement')} turn={sec.turn} bar={sec.bar} hue={sectionTint(k, sections.length)} />
          <figcaption>{sec.name} · bar {sec.bar + 1}</figcaption>
        </figure>
      {/each}
      <figure>
        <MeterMock {...meterOf('arrangement')} turn={0.3} bar={2} />
        <figcaption>no selector: white</figcaption>
      </figure>
    </div>
  </section>

  <section data-mock="2-resonator-bodies">
    <h2>2 · A resonator’s body: how each body= could look</h2>
    <div class="bodies">
      <div></div>
      {#each q2 as o (o.label)}<div class="head">
          <h3>{o.label}</h3>
          <p>{o.note}</p>
        </div>{/each}
      {#each bodies as b (b.body)}
        <div class="who">
          <h3>body={b.body}</h3>
          <p>{b.shifts.join(' ')}</p>
          <p>{b.seen}</p>
        </div>
        {#each q2 as o (o.label)}<div class="cell"><BodyMock body={b.body} shifts={b.shifts} option={o.option} ringing={'ringing' in o ? o.ringing : 0} /></div>{/each}
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
  .swings {
    display: grid;
    grid-template-columns: repeat(3, 440px);
    gap: 14px;
    align-items: start;
  }
  .swing {
    background: var(--bg);
    border-radius: var(--radius);
    padding: 10px 12px 14px;
  }
  .swing p {
    font-size: 11px;
    color: var(--text-muted);
    margin: 0 0 10px;
    min-height: 44px;
  }
  .swing .big {
    margin-top: 16px;
  }
  .details {
    display: flex;
    gap: 28px;
    align-items: center;
    background: var(--bg);
    border-radius: var(--radius);
    padding: 16px 22px;
    width: fit-content;
  }
  .details dl {
    margin: 0;
    display: grid;
    gap: 14px;
    min-width: 360px;
  }
  .details dt {
    font: 700 11px var(--font-code);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .details dd {
    margin: 4px 0 0;
    display: grid;
    gap: 8px;
    font-size: 13px;
  }
  .details dd span:not(.slider) {
    color: var(--text-muted);
  }
  .slider {
    position: relative;
    display: block;
    height: 30px;
    margin: 4px 8px 0;
    border-top: 2px solid var(--text-faint);
  }
  .slider i {
    position: absolute;
    top: -7px;
    width: 12px;
    height: 12px;
    margin-left: -6px;
    border-radius: 50%;
    background: var(--accent);
  }
  .slider b {
    position: absolute;
    top: 8px;
    transform: translateX(-50%);
    font: 11px var(--font-code);
    color: var(--text-muted);
  }
  figure {
    margin: 0;
    text-align: center;
  }
  figcaption {
    font: 11px var(--font-code);
    color: var(--text-muted);
    margin-top: 6px;
  }
  .strip {
    display: flex;
    gap: 22px;
    justify-content: center;
    margin: 10px 0;
  }
  .bodies {
    display: grid;
    grid-template-columns: 170px repeat(5, 190px);
    gap: 6px 10px;
    align-items: center;
  }
  .bodies .head p,
  .bodies .who p {
    font-size: 11px;
    color: var(--text-muted);
    margin: 2px 0 0;
  }
  .bodies .cell {
    background: var(--bg);
    border-radius: var(--radius);
    display: flex;
    justify-content: center;
  }
  /* 1 · flat: no gradient shading or drop shadows on the physical wheels */
  .flat :global(.turntable),
  .flat :global(.plugin) {
    filter: none !important;
    box-shadow: none !important;
  }
  .flat :global(.turntable .tick),
  .flat :global(.turntable .groove) {
    opacity: 0.4;
  }
</style>
