<script lang="ts">
  import { useStore, useSvelteFlow } from '@xyflow/svelte';

  /** `calm`: frame it only when something has gone out of view, and slowly (a graph growing, #390: the camera stays put
   * while it can, and follows without a jerk when it must). */
  let { token, calm = false }: { token: number; calm?: boolean } = $props();
  const flow = useSvelteFlow();
  const store = useStore();

  /** Whether every node is in view, a margin in. */
  function inView(): boolean {
    const nodes = flow.getNodes();
    if (!nodes.length) return true;
    const b = flow.getNodesBounds(nodes);
    const { x, y, zoom } = flow.getViewport();
    const m = 0.04 * Math.min(store.width, store.height);
    const [left, top] = [(m - x) / zoom, (m - y) / zoom];
    const [right, bottom] = [(store.width - m - x) / zoom, (store.height - m - y) / zoom];
    return b.x >= left && b.y >= top && b.x + b.width <= right && b.y + b.height <= bottom;
  }

  $effect(() => {
    if (token <= 0) return;
    const gently = calm;
    // (maxZoom: a small graph shouldn't fill the screen — its sliders and labels need room)
    const t = setTimeout(() => {
      if (gently && inView()) return;
      flow.fitView({ padding: 0.12, duration: gently ? 900 : 400, maxZoom: 0.9 });
    }, 60);
    return () => clearTimeout(t);
  });
  // (calm: a growing graph also drifts between its versions; looked at once a second, framed again when it went out)
  $effect(() => {
    if (!calm) return;
    const every = setInterval(() => {
      if (!inView()) flow.fitView({ padding: 0.12, duration: 900, maxZoom: 0.9 });
    }, 1000);
    return () => clearInterval(every);
  });
</script>
