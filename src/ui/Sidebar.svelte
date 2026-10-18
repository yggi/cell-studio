<script lang="ts">
  /**
   * The sidebar, on a wide screen the inspector (a pane at the right of the graph), on a phone a drawer over the view.
   * Its first page on a wide screen is the cell whose sheet is open (CellSheet.svelte: drawn by the graph, where this
   * page is, `--inspect-*`); then five pages, the piece's controls (every free() in it, and the keys and pads),
   * MIDI (the ports, how the piece goes out, the keys, learned knobs), the graph's layout forces, files, and the piece's
   * numbers (Stats). The tab
   * strip says which (arrow keys, Home and End move along it); a dot on MIDI says whether anything is connected. Focus moves into the drawer when it opens and
   * back to where it was when it closes; Escape closes it.
   */
  import { onMount } from 'svelte';
  import { getStudio } from './state/studio.svelte';
  import type { Panel } from './state/view.svelte';
  import FreePanel from './FreePanel.svelte';
  import MidiPanel from './MidiPanel.svelte';
  import ForcesPanel from './ForcesPanel.svelte';
  import FilePanel from './FilePanel.svelte';
  import StatsPanel from './StatsPanel.svelte';

  const { view, library, dock, midi, keys } = getStudio();
  const live = $derived(!!midi.access && (midi.sending || midi.inPortId !== 'none'));
  const PAGES = $derived<readonly (readonly [Panel, string])[]>([
    ...(keys.sheet && !view.narrow ? ([['cell', `&${keys.sheet}`]] as const) : []),
    ['controls', 'Controls'],
    ['midi', 'MIDI'],
    ['forces', 'Forces'],
    ['file', 'Files'],
    ['stats', 'Stats'],
  ]);
  const enabled = (page: Panel) => library.anyOpen || (page !== 'controls' && page !== 'forces' && page !== 'stats');

  let drawer: HTMLElement;
  // the tab strip as a roving tabindex: the page showing is the one Tab reaches; the arrows move along the enabled ones
  const onTabKey = (e: KeyboardEvent) => {
    const open = PAGES.map(([page]) => page).filter(enabled);
    const at = open.indexOf(view.panel);
    const next =
      e.key === 'ArrowRight'
        ? open[(at + 1) % open.length]
        : e.key === 'ArrowLeft'
          ? open[(at - 1 + open.length) % open.length]
          : e.key === 'Home'
            ? open[0]
            : e.key === 'End'
              ? open[open.length - 1]
              : null;
    if (!next) return;
    e.preventDefault();
    view.panel = next;
    drawer.querySelector<HTMLElement>(`#sidebar-tab-${next}`)?.focus();
  };
  const onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !e.defaultPrevented) view.closePanel();
  };
  // the cell's page: where its sheet is drawn (fixed, so in the window's coordinates), kept as it moves or resizes
  let page = $state<HTMLElement>();
  $effect(() => {
    if (view.panel !== 'cell' || !page) return;
    const el = page;
    const root = document.documentElement.style;
    const place = () => {
      const a = drawer.getBoundingClientRect();
      const p = el.getBoundingClientRect();
      root.setProperty('--inspect-left', `${a.left}px`);
      root.setProperty('--inspect-width', `${a.width}px`);
      root.setProperty('--inspect-top', `${p.top}px`);
      root.setProperty('--inspect-height', `${a.bottom - p.top}px`);
    };
    place();
    const seen = new ResizeObserver(place);
    seen.observe(drawer);
    seen.observe(el);
    return () => seen.disconnect();
  });
  onMount(() => {
    const opener = document.activeElement;
    // (opened round a cell, the focus stays where it was: in the graph)
    if (view.panel !== 'cell') drawer.querySelector<HTMLElement>('[role=tab][aria-selected=true]')?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  });
</script>

<!-- (keys bubble up from whatever in the drawer has focus; the drawer itself isn't a control) -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<aside class="drawer" aria-label="Sidebar" bind:this={drawer} {onkeydown}>
  <header>
    <div class="tabs" role="tablist" aria-label="Sidebar page" tabindex="-1" onkeydown={onTabKey}>
      {#each PAGES as [page, label] (page)}
        <button
          role="tab"
          id="sidebar-tab-{page}"
          aria-selected={view.panel === page}
          aria-controls="sidebar-page"
          tabindex={view.panel === page ? 0 : -1}
          class="unstyled"
          class:on={view.panel === page}
          disabled={!enabled(page)}
          onclick={() => (view.panel = page)}
          >{label}{#if page === 'midi'}<span class="dot" class:live role="img" aria-label={live ? 'connected' : 'not connected'}></span>{/if}</button
        >
      {/each}
    </div>
    <button class="x unstyled" onclick={() => view.closePanel()} aria-label="Close">×</button>
  </header>
  <div id="sidebar-page" role="tabpanel" aria-labelledby="sidebar-tab-{view.panel}">
    {#if view.panel === 'cell'}
      <div class="cellpage" bind:this={page}></div>
    {:else if view.panel === 'midi'}
      <MidiPanel {midi} />
    {:else if view.panel === 'forces'}
      {#if view.layout}
        <ForcesPanel options={view.layout.options} onchange={(k, v) => view.layout?.setForce(k, v)} onreset={() => view.layout?.resetForces()} />
      {:else}
        <p class="none">Open a piece to move the forces of its graph.</p>
      {/if}
    {:else if view.panel === 'file'}
      <FilePanel />
    {:else if view.panel === 'stats'}
      <StatsPanel />
    {:else}
      <button
        class="dock-toggle"
        aria-pressed={dock.open}
        onclick={() => {
          dock.toggle();
          if (dock.open && view.narrow) view.panelOpen = false;
        }}>{dock.open ? 'Hide' : 'Show'} the keys and pads</button
      >
      <FreePanel />
    {/if}
  </div>
</aside>

<style>
  .drawer {
    position: fixed;
    z-index: 50;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(360px, 92vw);
    overflow: auto;
    padding: 0 16px 24px;
    background: var(--surface);
    border-left: 1px solid var(--line);
    box-shadow: -12px 0 30px rgba(0, 0, 0, 0.45);
  }
  /* a wide screen: the inspector, a pane in the app's grid beside the graph (under it in the stacking: a cell's sheet,
     drawn by the graph, lies over its page) */
  @media (min-width: 900px) {
    .drawer {
      position: relative;
      grid-area: inspect;
      z-index: auto;
      top: auto;
      right: auto;
      bottom: auto;
      width: 380px;
      min-height: 0;
      display: flex;
      flex-direction: column;
      box-shadow: none;
    }
    .cellpage {
      flex: 1;
    }
  }
  header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 -16px 12px;
    padding: 8px 12px 0 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  .tabs {
    display: flex;
    gap: 0;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tabs button {
    position: relative;
    min-height: 44px;
    flex: none;
    padding: 0 6px;
    color: var(--text-muted);
    font: 700 12px var(--font-ui);
    white-space: nowrap;
    cursor: pointer;
  }
  /* (the cell's page: its name, in the code's face, the accent's colour) */
  #sidebar-tab-cell {
    flex: 0 1 auto;
    min-width: 4em;
    max-width: 7em;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-code);
    color: var(--accent);
  }
  .tabs button.on {
    color: var(--text);
  }
  .tabs button.on::after {
    content: '';
    position: absolute;
    left: 6px;
    right: 6px;
    bottom: -1px;
    height: 3px;
    border-radius: 3px 3px 0 0;
    background: var(--rainbow);
  }
  .tabs button:disabled {
    color: var(--text-faint);
    cursor: default;
  }
  .dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-left: 6px;
    border-radius: 50%;
    background: var(--text-faint);
    vertical-align: middle;
  }
  .dot.live {
    background: var(--meter-1);
  }
  .none {
    margin: 0;
    color: var(--text-muted);
    font: 500 14px var(--font-ui);
  }
  .x {
    font-size: 22px;
    padding: 0 6px;
    cursor: pointer;
  }
  .dock-toggle {
    width: 100%;
    min-height: 40px;
    margin-bottom: 14px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 600 14px var(--font-ui);
    cursor: pointer;
  }
  .dock-toggle[aria-pressed='true'] {
    border-color: var(--accent);
  }
  .dock-toggle:focus-visible,
  .x:focus-visible,
  .tabs button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
