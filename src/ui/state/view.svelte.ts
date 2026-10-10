import { MediaQuery } from 'svelte/reactivity';
import { keepPerf, perfWanted } from '../perfSwitch';
import type { GraphLayout } from './graphLayout.svelte';

export type Tab = 'select' | 'graph' | 'code';
/** What the sidebar shows: the piece's controls, MIDI (ports, channels, keys, learned knobs), the graph's layout forces, or files. */
export type Panel = 'controls' | 'midi' | 'forces' | 'file';

/** What's on screen: the view (a tab on a phone), the controls drawer, the performance overlay, a line of news. */
export class View {
  /** The first view is choosing a piece (the library as a graph); then the piece's graph and its code. */
  tab = $state<Tab>('select');
  readonly #wide = new MediaQuery('min-width: 900px');
  /** Tabs only on narrow screens (matches the CSS breakpoint). */
  readonly narrow = $derived(!this.#wide.current);
  /** The sidebar (a drawer on the right): the controls (every free() of the piece) and MIDI. */
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

  /** Open the sidebar on a page; asked again for the page already showing, it closes. */
  togglePanel(which: Panel): void {
    this.panelOpen = !(this.panelOpen && this.panel === which);
    this.panel = which;
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
