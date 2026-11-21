<script lang="ts">
  /**
   * A fragment heard alone, pictured by its facet (`FragmentFace`), over the graph under the fragment's bar: what its host
   * plays, and what it reads.
   */
  import { getStudio } from './state/studio.svelte';
  import { heardOf } from '../compile';
  import { controlsOf, pictureOf } from '../layout/preview';
  import FragmentFace from './FragmentFace.svelte';

  const { piece } = getStudio();
  const heard = $derived(heardOf(piece.program));
  // (nothing to picture and nothing it reads: no card)
  const shown = $derived(!!piece.fragment && (pictureOf(piece.fragment.facets, piece.code, heard.notes, heard.bar).kind !== 'none' || controlsOf(piece.code).length > 0));
</script>

{#if piece.fragment && shown}
  <div class="preview"><FragmentFace label={piece.fragment.id} facets={piece.fragment.facets} text={piece.code} {heard} /></div>
{/if}

<style>
  .preview {
    padding: 10px 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
  }
</style>
