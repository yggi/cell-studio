<script lang="ts">
  /**
   * A list of suggestions to pick from (`suggest.ts`'s `Suggestion`): the graph's editing pop-up's (EditPop) and the code
   * view's after `from` (#624). `active` marks the one Enter takes.
   */
  import type { Suggestion } from './suggest';

  let {
    suggestions,
    onpick,
    active = -1,
    label = 'suggestions',
  }: { suggestions: readonly Suggestion[]; onpick: (s: Suggestion) => void; active?: number; label?: string } = $props();
</script>

<ul class="list" role="listbox" aria-label={label}>
  {#each suggestions as s, i (s.text + i)}
    <li role="option" aria-selected={i === active}>
      <button class="unstyled {s.kind}" class:active={i === active} tabindex="-1" onmousedown={(e) => e.preventDefault()} onclick={() => onpick(s)}
        >{s.label}{#if s.detail}<span class="detail">{s.detail}</span>{/if}</button
      >
    </li>
  {/each}
</ul>

<style>
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 220px;
    overflow: auto;
    border-radius: 8px;
    border: 1px solid var(--line);
  }
  .list button {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
    padding: 9px 12px;
    font: 500 14px var(--font-code);
    color: var(--accent);
  }
  .list button.active,
  .list button:hover {
    background: var(--surface-2);
  }
  .list li + li {
    border-top: 1px solid var(--line);
  }
  .list .function,
  .list .value {
    color: var(--text);
  }
  .list .rest {
    color: var(--text-muted);
  }
  .detail {
    color: var(--text-muted);
    font: 12px var(--font-ui);
  }
</style>
