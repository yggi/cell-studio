<script lang="ts">
  import { useStore, useSvelteFlow } from '@xyflow/svelte';

  type Rect = { x: number; y: number; width: number; height: number };
  /**
   * `calm`: frame it only when something has gone out of view, and slowly (a graph growing, #390: the camera stays put
   * while it can, and follows without a jerk when it must). `extra`: what else is framed with the nodes (a cluster's
   * name, which is no node), in the flow's coordinates.
   */
  let { token, calm = false, extra = () => [] }: { token: number; calm?: boolean; extra?: () => readonly Rect[] } = $props();
  const flow = useSvelteFlow();
  const store = useStore();
  const PADDING = 0.12;
  // (a small graph shouldn't fill the screen — its sliders and labels need room)
  const MAX_ZOOM = 0.9;

  /** The nodes' bounds, and what else is framed with them; null for no nodes. */
  function bounds(): Rect | null {
    const nodes = flow.getNodes();
    if (!nodes.length) return null;
    const rs = [flow.getNodesBounds(nodes), ...extra()];
    const x = Math.min(...rs.map((r) => r.x));
    const y = Math.min(...rs.map((r) => r.y));
    return { x, y, width: Math.max(...rs.map((r) => r.x + r.width)) - x, height: Math.max(...rs.map((r) => r.y + r.height)) - y };
  }
  /** Frame it all (as `fitView` does, with what else is framed). */
  function fit(duration: number) {
    const b = bounds();
    if (!b) return;
    const zoom = Math.min(store.width / (b.width * (1 + 2 * PADDING)), store.height / (b.height * (1 + 2 * PADDING)), MAX_ZOOM);
    void flow.setViewport({ x: store.width / 2 - (b.x + b.width / 2) * zoom, y: store.height / 2 - (b.y + b.height / 2) * zoom, zoom }, { duration });
  }

  /** Whether every node is in view, a margin in. */
  function inView(): boolean {
    const b = bounds();
    if (!b) return true;
    const { x, y, zoom } = flow.getViewport();
    const m = 0.04 * Math.min(store.width, store.height);
    const [left, top] = [(m - x) / zoom, (m - y) / zoom];
    const [right, bottom] = [(store.width - m - x) / zoom, (store.height - m - y) / zoom];
    return b.x >= left && b.y >= top && b.x + b.width <= right && b.y + b.height <= bottom;
  }

  $effect(() => {
    if (token <= 0) return;
    const gently = calm;
    const t = setTimeout(() => {
      if (gently && inView()) return;
      fit(gently ? 900 : 400);
    }, 60);
    return () => clearTimeout(t);
  });
  // (calm: a growing graph also drifts between its versions; looked at once a second, framed again when it went out)
  $effect(() => {
    if (!calm) return;
    const every = setInterval(() => {
      if (!inView()) fit(900);
    }, 1000);
    return () => clearInterval(every);
  });
</script>
