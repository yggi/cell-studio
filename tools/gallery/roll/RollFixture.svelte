<script lang="ts">
  /** One piano roll (`src/ui/PianoRoll.svelte`) as a cell's sheet shows it: its piece's context at a moment, stopped or playing. */
  import { untrack } from 'svelte';
  import { liveAt } from '../../../src/engine/live';
  import { setGraphContext } from '../../../src/ui/context';
  import PianoRoll from '../../../src/ui/PianoRoll.svelte';
  import { madeUpSound } from '../sound';
  import type { Piece } from '../pieces';

  let props: { piece: Piece; name: string; playing: boolean; held?: ReadonlySet<number> } = $props();
  const { piece: p, name, playing, held } = untrack(() => props);
  const live = playing ? p.live : null;
  setGraphContext({
    program: p.program,
    muted: new Set(),
    routed: p.routed,
    state: live ? 'playing' : 'stopped',
    playing: !!live,
    heads: live ?? liveAt(p.program, p.shifts, new Set(), 0),
    lit: live,
    liveEdges: live ? live.edges : null,
    turned: live ? 'live' : '',
    shifts: p.shifts,
    turn() {},
    setFree() {},
    open() {},
    bends: new Map(),
    toggle() {},
    nudge() {},
    cursor: 0,
    epoch: 0,
    move() {},
    sound: madeUpSound(() => playing),
  });
</script>

<div class="sheet"><PianoRoll {name} source={p.source} onedit={() => {}} {held} /></div>

<style>
  /* a phone's sheet: 360 px less its padding */
  .sheet {
    width: 332px;
    padding: 0 14px 12px;
    background: var(--surface);
    border-radius: 14px;
  }
</style>
