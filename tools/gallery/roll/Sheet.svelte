<script lang="ts">
  /**
   * The piano roll's sheet (#211): the roll as a cell's sheet shows it, at a phone's width — blank, over a scale, in
   * semitones, over 19-EDO, chords and holds, a kit, playing (a playhead and the ghosts of a bass on the same table, a
   * key held), and a braid it can't show. Small pieces of its own, so each state is there whatever the examples hold.
   */
  import RollFixture from './RollFixture.svelte';
  import { pieceOf } from '../pieces';

  const q = new URLSearchParams(location.search);
  const seconds = Number(q.get('t') ?? 3);
  const BAR = '&bar meter("4/4", 2) step=96bpm\n&lead s=tri loop=C4\n&bass s=sine loop=C3\n';
  const fixtures: { kind: string; caption: string; source: string; name: string; playing?: boolean; held?: number[] }[] = [
    { kind: 'blank', caption: 'blank: a new cell, its table', source: `${BAR}&tune step=&bar\n&mix map=sample [&tune * &lead]`, name: 'tune' },
    {
      kind: 'scale',
      caption: 'over a scale: D dorian, 7 rows a lap',
      source: `${BAR}&tune over=scale(dorian, D) step=&bar 0 1 2 3 4 3 2 1 0@2 ~ 4 7@2 ~@2\n&mix map=sample [&tune * &lead]`,
      name: 'tune',
    },
    {
      kind: 'semitones',
      caption: 'without over=: semitones on the 12',
      source: `${BAR}&tune step=&bar 0 3 5 6 7 ~ 10 12 ~ 10 7@2 5 3 0@2\n&mix map=sample [&tune * &lead]`,
      name: 'tune',
    },
    {
      kind: 'edo19',
      caption: 'over 19-EDO: 19 rows a lap',
      source: `${BAR}&edo19 cycle=19 map=edo\n&tune over=&edo19 step=&bar 0 3 6 8 11 ~ 14 19@2 ~ 16 11 8@2 6 3\n&mix map=sample [&tune * &lead]`,
      name: 'tune',
    },
    {
      kind: 'chords',
      caption: 'chords and holds: [a,b]@n',
      source: `${BAR}&s scale(major)\n&comp over=&s step=&bar [0,2,4]@4 [3,5,7]@4 [4,6,8]@2 [4,6,9]@2 [0,2,4]@3 ~\n&mix map=sample [&comp * &lead]`,
      name: 'comp',
    },
    {
      kind: 'kit',
      caption: 'over a kit: a row per voice',
      source: `${BAR}&lo s=sine loop=G2\n&mid s=sine loop=C3\n&hi s=white\n&kit &lo &mid &hi\n&beat over=&kit step=&bar 0 2 [1,2] 2 0 [0,2] [1,2] 2\n&mix map=sample [&beat * .4]`,
      name: 'beat',
    },
    {
      kind: 'playing',
      caption: 'playing: the playhead on the heard step, a bass on the same table as ghosts, a key held',
      source: `${BAR}&s scale(minor, A)\n&tune over=&s step=&bar 4 ~ 2 3 4@2 2 0 1 2@2 ~ 4 3@2 2\n&low over=&s step=&bar*2 0 0 -2 -3 -2 -2 0 ~\n&mix map=sample [&tune * &lead, &low * &bass]`,
      name: 'tune',
      playing: true,
      held: [4],
    },
    { kind: 'refused', caption: 'not editable: a generator', source: `${BAR}&hits step=&bar euclid(3, 8)\n&mix map=sample [&hits * &lead]`, name: 'hits' },
  ];
  const shown = fixtures.map((f) => ({ ...f, piece: pieceOf(f.kind, f.source, f.playing ? seconds : 0) }));
</script>

<main>
  {#each shown as f (f.kind)}
    <figure data-kind={f.kind}>
      <figcaption><b>{f.kind}</b> · {f.caption}</figcaption>
      {#if f.piece}
        <RollFixture piece={f.piece} name={f.name} playing={!!f.playing} held={f.held ? new Set(f.held) : undefined} />
      {:else}
        <p class="bad">does not compile</p>
      {/if}
    </figure>
  {/each}
</main>

<style>
  main {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    padding: 18px;
    background: var(--bg);
    color: var(--text);
    font: 13px var(--font-ui);
  }
  figure {
    margin: 0;
  }
  figcaption {
    margin: 0 0 6px;
    max-width: 360px;
    color: var(--text-muted);
  }
  .bad {
    color: var(--danger);
  }
</style>
