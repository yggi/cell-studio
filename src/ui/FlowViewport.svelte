<script lang="ts">
  /** Hands the flow's viewport (pan and zoom) to what is drawn outside the flow: the tower beside it (TowerAxis.svelte). */
  import { useStore, type Viewport } from '@xyflow/svelte';

  let { onchange }: { onchange: (v: Viewport) => void } = $props();
  const store = useStore();
  $effect(() => onchange({ ...store.viewport }));
</script>
