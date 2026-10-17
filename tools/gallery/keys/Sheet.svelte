<script lang="ts">
  /**
   * The keys sheet (#255): the dock's on-screen keyboard and drum pads, by the real components (`PianoKeys`,
   * `DrumPads`), in each state: at rest, scale dots (a pentatonic, a mode, a scale over 19-EDO, read by
   * `engine/keys.ts` `scaleKeys` from a piece), keys held (white, black, a chord, lit in their pitch's colour), the
   * pads at rest, held and glowing with the plan, and a phone's width. Nothing sounds: the presses go nowhere.
   */
  import PianoKeys from '../../../src/ui/PianoKeys.svelte';
  import DrumPads from '../../../src/ui/DrumPads.svelte';
  import { compileSource } from '@yggi/cells/engine/compile';
  import { codeShifts } from '@yggi/cells/engine/program';
  import { kitPads, scaleKeys } from '@yggi/cells/engine/keys';
  import { keyRange } from '@yggi/webmidi/core';

  const scaleOf = (src: string) => {
    const r = compileSource(src, { SAMPLE_RATE: 48000, A4: 440 });
    return scaleKeys(r, 'tune', codeShifts(r));
  };
  const melody = (table: string) => `&v s=sine loop=C4\n${table}\n&tune over=&s step=2 0 1 2\n&mix map=sample [&tune * &v]`;
  const PENTA = scaleOf(melody('&s 0 2 4 7 9'));
  const DORIAN = scaleOf(melody('&s scale(dorian, D)'));
  const EDO19 = scaleOf(`&edo19 cycle=19 map=edo\n${melody('&s over=&edo19 0 3 6 8 11 14 17')}`);
  const kit = compileSource(
    `&bar step=4\n&drums step=&bar &kick &hat &snare &hat &clap &rim &tom &ride\n&kick s=sine loop=A1\n&snare s=white\n&hat s=white hpf=7000\n&clap s=white\n&rim s=white\n&tom s=sine loop=A2\n&ride s=white hpf=5000\n&mix map=sample [&drums]`,
    { SAMPLE_RATE: 48000, A4: 440 },
  );
  const PADS = kitPads(kit, 'drums');
  const none = () => {};
  const two = keyRange(4, 2);
  const one = keyRange(4, 1);

  const KEYS = [
    { kind: 'keys-rest', label: 'at rest, no scale (a voice no melody plays)', held: [], scale: null },
    { kind: 'keys-dots-pentatonic', label: 'scale dots: C pentatonic', held: [], scale: PENTA },
    { kind: 'keys-dots-dorian', label: 'scale dots: D Dorian', held: [], scale: DORIAN },
    { kind: 'keys-dots-19edo', label: 'scale dots: a 7-step scale over 19-EDO (each pitch on its nearest key)', held: [], scale: EDO19 },
    { kind: 'keys-held-chord', label: 'held: a C major chord (C4 E4 G4), with the pentatonic', held: [60, 64, 67], scale: PENTA },
    { kind: 'keys-held-black', label: 'held: black keys (F♯4, B♭4, C♯5) and a white (D5)', held: [66, 70, 73, 74], scale: DORIAN },
  ];
</script>

<main>
  <h1>Keys and pads</h1>
  <p class="meta">The dock's keyboard and drum pads (#255), by the real components · <code>node tools/gallery.mjs keys</code></p>
  <h2>Keyboard · two octaves from C4</h2>
  <div class="list">
    {#each KEYS as k (k.kind)}
      <figure data-kind={k.kind}>
        <figcaption>{k.label}</figcaption>
        <div class="frame wide"><PianoKeys low={two.low} high={two.high} held={new Set(k.held)} scale={k.scale} onpress={none} onrelease={none} /></div>
      </figure>
    {/each}
  </div>
  <h2>Pads · a kit of eight</h2>
  <div class="list">
    <figure data-kind="pads-rest">
      <figcaption>at rest</figcaption>
      <div class="frame pads"><DrumPads pads={PADS} down={() => false} sounding={() => false} onpress={none} onrelease={none} /></div>
    </figure>
    <figure data-kind="pads-held">
      <figcaption>held: &amp;kick and &amp;snare (here, MIDI in or the computer keys)</figcaption>
      <div class="frame pads">
        <DrumPads pads={PADS} down={(m) => m === 'kick' || m === 'snare'} sounding={() => false} onpress={none} onrelease={none} />
      </div>
    </figure>
    <figure data-kind="pads-sounding">
      <figcaption>playing: &amp;hat glows with the plan, &amp;kick held</figcaption>
      <div class="frame pads"><DrumPads pads={PADS} down={(m) => m === 'kick'} sounding={(m) => m === 'hat' || m === 'kick'} onpress={none} onrelease={none} /></div>
    </figure>
  </div>
  <h2>A phone's width · 412 px</h2>
  <div class="list">
    <figure data-kind="phone-keys">
      <figcaption>one octave, D Dorian, D4 + A4 held</figcaption>
      <div class="frame phone"><PianoKeys low={one.low} high={one.high} held={new Set([62, 69])} scale={DORIAN} onpress={none} onrelease={none} /></div>
    </figure>
    <figure data-kind="phone-pads">
      <figcaption>the pads</figcaption>
      <div class="frame phone"><DrumPads pads={PADS} down={(m) => m === 'snare'} sounding={() => false} onpress={none} onrelease={none} /></div>
    </figure>
  </div>
</main>

<style>
  main {
    padding: 16px 24px;
    background: var(--bg);
    color: var(--text);
    font: 14px var(--font-ui);
  }
  .meta {
    color: var(--text-muted);
  }
  .list {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
  figure {
    margin: 0;
    padding: 10px;
    background: var(--surface);
    border-radius: 10px;
  }
  figcaption {
    margin-bottom: 8px;
    color: var(--text-muted);
  }
  .frame {
    box-sizing: border-box;
  }
  .wide {
    width: 620px;
    height: 170px;
  }
  .pads {
    width: 440px;
    height: 140px;
  }
  .phone {
    width: 392px;
    height: 200px;
  }
</style>
