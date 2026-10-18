<script lang="ts">
  import { useStore, useSvelteFlow } from '@xyflow/svelte';
  import { untrack } from 'svelte';

  /**
   * Zooms the view by `factor` about a point (px in the flow's box): what a pinch on the tower's strip asks for, the
   * strip taking the gesture itself (TowerStrips.svelte). Each new `zoom` once (`n` tells repeats apart).
   */
  let { zoom }: { zoom: { factor: number; x: number; y: number; n: number } | null } = $props();
  const flow = useSvelteFlow();
  const store = useStore();

  $effect(() => {
    if (!zoom) return;
    untrack(() => {
      const v = flow.getViewport();
      const next = Math.min(store.maxZoom, Math.max(store.minZoom, v.zoom * zoom.factor));
      const k = next / v.zoom;
      void flow.setViewport({ x: zoom.x - (zoom.x - v.x) * k, y: zoom.y - (zoom.y - v.y) * k, zoom: next });
    });
  });
</script>
