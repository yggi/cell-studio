<script lang="ts">
  import { useSvelteFlow } from '@xyflow/svelte';
  import { untrack } from 'svelte';

  /** Moves the view to `to` (the graph's coordinates), keeping its zoom, quickly and eased: each new `to` once. */
  let { to }: { to: { x: number; y: number } | null } = $props();
  const flow = useSvelteFlow();
  // (ease in and out, cubic: quick, without a jerk at either end)
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  $effect(() => {
    // (the zoom read untracked: the view moving would move it again)
    if (to) void untrack(() => flow.setCenter(to.x, to.y, { zoom: flow.getViewport().zoom, duration: 380, ease, interpolate: 'linear' }));
  });
</script>
