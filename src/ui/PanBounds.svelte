<script lang="ts">
  import { useStore } from '@xyflow/svelte';

  /** The bounds the view can't be panned beyond (the graph's coordinates); none, unbounded. (Svelte Flow reads its own
   * `translateExtent` once: a change has to go through its store.) */
  let { extent }: { extent: [[number, number], [number, number]] | undefined } = $props();
  const store = useStore();
  const none: [[number, number], [number, number]] = [
    [-Infinity, -Infinity],
    [Infinity, Infinity],
  ];

  $effect(() => store.setTranslateExtent(extent ?? none));
</script>
