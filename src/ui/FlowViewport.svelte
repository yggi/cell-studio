<script lang="ts">
  /** Hands the flow's viewport (pan and zoom) to what is drawn outside the flow: the tower layout's strip and sky beside and behind it (TowerStrips.svelte, TowerSky.svelte). */
  import { useStore, type Viewport } from '@xyflow/svelte';

  let { onchange }: { onchange: (v: Viewport) => void } = $props();
  const store = useStore();
  $effect(() => onchange({ ...store.viewport }));
</script>
