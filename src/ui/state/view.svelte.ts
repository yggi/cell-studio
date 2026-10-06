import { MediaQuery } from 'svelte/reactivity';
import { keepPerf, perfWanted } from '../perfSwitch';

export type Tab = 'select' | 'graph' | 'code';

/** What's on screen: the view (a tab on a phone), the controls drawer, the performance overlay, a line of news. */
export class View {
  /** The first view is choosing a piece (the library as a graph); then the piece's graph and its code. */
  tab = $state<Tab>('select');
  readonly #wide = new MediaQuery('min-width: 900px');
  /** Tabs only on narrow screens (matches the CSS breakpoint). */
  readonly narrow = $derived(!this.#wide.current);
  /** The controls drawer (every free() of the piece). */
  panelOpen = $state(false);
  /** The performance overlay (ui/perfSwitch.ts): loaded only when on. */
  perf = $state(perfWanted());
  /** A line for the picker: saved, rendered, couldn't load … */
  message = $state<string | null>(null);
  /** A cell to open in its sheet once it's in the graph (added, renamed): the token makes each ask new. */
  focus = $state.raw<{ name: string; token: number } | null>(null);

  togglePerf(): void {
    this.perf = !this.perf;
    keepPerf(this.perf);
  }
  /** Open a cell's sheet as soon as it's in the graph. */
  focusOn(name: string): void {
    this.focus = { name, token: (this.focus?.token ?? 0) + 1 };
  }
}
