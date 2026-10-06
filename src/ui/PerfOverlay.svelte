<script lang="ts">
  /**
   * The performance overlay (open the app with ?perf, or Files ▾ → Performance report): live frame and
   * main-thread numbers over the last 10 s, and a recording whose report you can copy and paste into an issue.
   * Loaded only when asked for (a dynamic import), so it costs nothing otherwise.
   */
  import { onDestroy, onMount } from 'svelte';
  import { load } from '../audio/ticker';
  import { buildReport, PerfCollector, type PerfSources } from './perf';

  let {
    sources,
    meta,
    onclose,
  }: {
    sources: Pick<PerfSources, 'playing' | 'audio'>;
    /** The piece open now, asked at the moment a report is made. */
    meta: () => { version: string; piece: { title: string | null; graphNodes: number | null; cells: number | null } };
    onclose: () => void;
  } = $props();

  const collector = new PerfCollector({
    playing: () => sources.playing(),
    loadScale: () => load.scale,
    audio: () => sources.audio(),
  });
  let open = $state(false);
  let live = $state(collector.live());
  let recordingFrom = $state<number | null>(null);
  let recordedSeconds = $state(0);
  let report = $state('');
  let note = $state('');
  let timer: ReturnType<typeof setInterval> | undefined;

  onMount(() => {
    collector.start();
    timer = setInterval(() => {
      live = collector.live();
      if (recordingFrom !== null) recordedSeconds = (collector.now() - recordingFrom) / 1000;
    }, 500);
  });
  onDestroy(() => {
    collector.stop();
    clearInterval(timer);
  });

  function make(from: number, to: number) {
    report = buildReport(collector.report(from, to, meta()));
  }
  function toggleRecord() {
    note = '';
    if (recordingFrom === null) {
      report = '';
      recordingFrom = collector.now();
      recordedSeconds = 0;
    } else {
      make(recordingFrom, collector.now());
      recordingFrom = null;
      note = 'Recording stopped. Report ready below.';
    }
  }
  async function copy() {
    // (no recording made: the last minute)
    if (recordingFrom !== null) make(recordingFrom, collector.now());
    else if (!report) make(collector.now() - 60000, collector.now());
    try {
      await navigator.clipboard.writeText(report);
      note = 'Copied. Paste it into the issue.';
    } catch {
      // (no clipboard here: select the text so a long press can copy it)
      note = 'Could not copy automatically: select the text below and copy it.';
      const ta = document.querySelector<HTMLTextAreaElement>('.perf textarea');
      ta?.focus();
      ta?.select();
    }
  }
  async function share() {
    if (!report) make(collector.now() - 60000, collector.now());
    try {
      await navigator.share?.({ title: 'Cell studio performance report', text: report });
    } catch {
      /* cancelled */
    }
  }

  const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  // a colour for the pill: how the last 10 s went
  const health = $derived(live.longMaxMs > 100 || live.fps < 30 ? 'bad' : live.longMaxMs > 50 || live.blockedPct > 15 || live.scale > 1.2 ? 'warn' : 'ok');
</script>

<div class="perf" class:open>
  {#if !open}
    <button class="pill {health}" onclick={() => (open = true)} aria-label="Performance overlay">
      {recordingFrom !== null ? `● ${clock(recordedSeconds)}` : 'perf'} · {live.fps.toFixed(0)} fps · {live.longCount} long
    </button>
  {:else}
    <div class="panel" role="dialog" aria-label="Performance">
      <header>
        <b>Performance</b>
        <span class="muted">last 10 s</span>
        <button class="x" onclick={() => (open = false)} aria-label="Collapse">–</button>
        <button class="x" onclick={onclose} aria-label="Close the overlay">×</button>
      </header>
      <dl>
        <dt>Frames</dt><dd>{live.fps.toFixed(0)} fps · p95 {live.p95Ms.toFixed(0)} ms · max {live.maxMs.toFixed(0)} ms</dd>
        <dt>Long tasks</dt><dd class={health}>{live.longCount} · longest {live.longMaxMs.toFixed(0)} ms · blocked {live.blockedPct.toFixed(0)} %</dd>
        <dt>Live views</dt><dd>{live.scale < 1.05 ? 'full rate' : `refresh ×${live.scale.toFixed(1)} slower`}</dd>
        <dt>Piece</dt><dd>{sources.playing() ? 'playing' : 'stopped'}{recordingFrom !== null ? ` · recording ${clock(recordedSeconds)}` : ''}</dd>
      </dl>
      <div class="row">
        <button class:rec={recordingFrom !== null} onclick={toggleRecord}>{recordingFrom === null ? '● Record' : '■ Stop'}</button>
        <button onclick={copy}>Copy report</button>
        {#if typeof navigator !== 'undefined' && 'share' in navigator}<button onclick={share}>Share</button>{/if}
      </div>
      <p class="hint">Press Record, play the piece for 30 s, press Stop, then Copy report. Without a recording, Copy gives the last minute.</p>
      {#if note}<p class="note" role="status">{note}</p>{/if}
      {#if report}<textarea readonly rows="8" value={report} onfocus={(e) => e.currentTarget.select()}></textarea>{/if}
    </div>
  {/if}
</div>

<style>
  .perf {
    position: fixed;
    z-index: 60;
    left: 8px;
    bottom: calc(env(safe-area-inset-bottom) + 8px);
    max-width: calc(100vw - 16px);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
  }
  .pill {
    background: var(--surface-2);
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    padding: 4px 10px;
    font: inherit;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }
  .pill.warn {
    border-color: var(--warning);
  }
  .pill.bad {
    border-color: var(--danger);
  }
  .panel {
    width: min(340px, calc(100vw - 16px));
    background: var(--surface-2);
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: var(--space-2) var(--space-3);
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  header .muted {
    color: var(--text-muted);
    flex: 1;
  }
  .x {
    background: none;
    color: var(--text-muted);
    border: 0;
    font-size: var(--text-md);
    cursor: pointer;
    padding: 0 var(--space-1);
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px var(--space-3);
    margin: var(--space-2) 0;
    font-variant-numeric: tabular-nums;
  }
  dt {
    color: var(--text-muted);
  }
  dd {
    margin: 0;
  }
  dd.warn {
    color: var(--warning);
  }
  dd.bad {
    color: var(--danger);
  }
  .row {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .row button {
    background: var(--accent);
    color: var(--accent-ink);
    border: 0;
    border-radius: var(--radius-sm);
    padding: 6px 10px;
    font: inherit;
    cursor: pointer;
  }
  .row button.rec {
    background: var(--danger);
  }
  .hint,
  .note {
    color: var(--text-muted);
    font-size: var(--text-xs);
    margin: var(--space-2) 0 0;
  }
  .note {
    color: var(--text);
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    margin-top: var(--space-2);
    background: var(--code-bg);
    color: var(--code);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    font: var(--text-xs) var(--font-code);
  }
</style>
