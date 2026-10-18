import { MediaQuery } from 'svelte/reactivity';
import { keepPerf, perfWanted } from '../perfSwitch';
import type { GraphLayout } from './graphLayout.svelte';

export type Tab = 'select' | 'graph' | 'code' | 'time';
/** What the sidebar shows: the cell whose sheet is open (a wide screen's inspector), the piece's controls, MIDI (ports,
 * channels, keys, learned knobs), the graph's layout forces, files, or the piece's numbers. */
export type Panel = 'cell' | 'controls' | 'midi' | 'forces' | 'file' | 'stats';

/** What's on screen: the view (a tab on a phone), the controls drawer, the performance overlay, a line of news. */
export class View {
  /** The first view is choosing a piece (the library as a graph); then the piece's graph, its code, and it in time (on a
   * wide screen the graph's pane shows the graph or the time view). */
  tab = $state<Tab>('select');
  readonly #wide = new MediaQuery('min-width: 900px');
  /** Tabs only on narrow screens (matches the CSS breakpoint). */
  readonly narrow = $derived(!this.#wide.current);
  /** The code beside the graph (a wide screen: a pane shown or hidden; a phone: its tab). */
  code = $state(true);
  /** The sidebar: on a wide screen the inspector, a pane at the right; on a phone a drawer over the view. */
  panelOpen = $state(false);
  /** Which of the sidebar's two pages shows. */
  panel = $state<Panel>('controls');
  /** The open graph's layout, for the sidebar's forces (the graph says it on mounting, and null on going). */
  layout = $state.raw<GraphLayout | null>(null);
  /** The performance overlay (ui/perfSwitch.ts): loaded only when on. */
  perf = $state(perfWanted());
  /** A line for the picker: saved, rendered, couldn't load … */
  message = $state<string | null>(null);
  /** A cell to open in its sheet once it's in the graph (added, renamed): the token makes each ask new. */
  focus = $state.raw<{ name: string; token: number } | null>(null);
  /** Asks the graph to close the sheet open (a new number each time). */
  unsheet = $state(0);

  /** Open the sidebar on a page; asked again for the page already showing, it closes. */
  togglePanel(which: Panel): void {
    this.panelOpen = !(this.panelOpen && this.panel === which);
    this.panel = which;
  }
  /** A cell's sheet opened (a name) or closed (null), the graph says: on a wide screen it is the inspector's first page. */
  sheet(name: string | null): void {
    if (this.narrow) return;
    if (name) this.showPanel('cell');
    else if (this.panel === 'cell') this.panelOpen = false;
  }
  /** Close the sidebar (the inspector showing a cell: its sheet too). */
  closePanel(): void {
    if (this.panel === 'cell') this.unsheet++;
    this.panelOpen = false;
  }
  /** Show a page of the sidebar, open. */
  showPanel(which: Panel): void {
    this.panel = which;
    this.panelOpen = true;
  }
  togglePerf(): void {
    this.perf = !this.perf;
    keepPerf(this.perf);
  }
  /** Open a cell's sheet as soon as it's in the graph. */
  focusOn(name: string): void {
    this.focus = { name, token: (this.focus?.token ?? 0) + 1 };
  }
}
