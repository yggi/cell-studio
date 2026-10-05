<script lang="ts">
  import { useSvelteFlow } from '@xyflow/svelte';

  let { token }: { token: number } = $props();
  const flow = useSvelteFlow();

  $effect(() => {
    if (token <= 0) return;
    // (maxZoom: a small graph shouldn't fill the screen — its sliders and labels need room)
    const t = setTimeout(() => flow.fitView({ padding: 0.12, duration: 400, maxZoom: 0.9 }), 60);
    return () => clearTimeout(t);
  });
</script>
