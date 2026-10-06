<script lang="ts">
  /**
   * The whole braid as one smart line — its steps, or its generator function.
   * The word being typed completes to cells, brackets and functions. It's
   * checked as you type; Enter applies. Empty leaves the default grid.
   */
  import { lastWord, suggest } from './suggest';
  import { parse } from '../engine/parser';
  import { trap } from './trap';

  let { text: initial, names, onapply, onclose }: { text: string; names: readonly string[]; onapply: (text: string) => void; onclose: () => void } = $props();

  let text = $state('');
  $effect(() => {
    text = initial;
  });
  const word = $derived(lastWord(text));
  const suggestions = $derived(suggest(word.word, names, true));
  const problem = $derived(text.trim() ? (parse(`&probe ${text}`).diagnostics[0]?.message ?? null) : null);
  const complete = (t: string) => (text = `${word.before}${t} `);
  const apply = () => {
    if (!problem) onapply(text.trim());
  };
</script>

<div class="backdrop" onclick={onclose} role="presentation"></div>
<div class="pop" role="dialog" aria-label="Edit the braid" aria-modal="true" use:trap={onclose}>
  <div class="field">
    <!-- svelte-ignore a11y_autofocus -->
    <input
      bind:value={text}
      autofocus
      aria-label="braid"
      autocomplete="off"
      spellcheck="false"
      placeholder="0 2 4 &motif …  or  scan(2 2 1 2 2 2 1)"
      onkeydown={(e) => {
        if (e.key === 'Enter') apply();
        if (e.key === 'Tab' && suggestions.length && word.word) {
          e.preventDefault();
          complete(suggestions[0].text);
        }
      }}
    />
    <button class="go" onclick={apply} disabled={!!problem}>Apply</button>
  </div>
  {#if problem}<p class="problem">{problem}</p>{/if}
  {#if suggestions.length && word.word}
    <ul class="list" role="listbox" aria-label="suggestions">
      {#each suggestions as s}
        <li><button class={s.kind} onclick={() => complete(s.text)}>{s.label}</button></li>
      {/each}
    </ul>
  {/if}
  <p class="hint">Steps separated by spaces, or one function. Empty: the default grid.</p>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: var(--scrim);
  }
  .pop {
    position: fixed;
    z-index: 61;
    left: 50%;
    top: 22%;
    transform: translateX(-50%);
    width: min(440px, calc(100vw - 24px));
    padding: 10px;
    border-radius: 14px;
    background: var(--surface);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-strong);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .field {
    display: flex;
    gap: 6px;
  }
  input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--accent);
    background: var(--code-bg);
    color: var(--text);
    font: 600 16px var(--font-code);
  }
  .go {
    min-height: 44px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--accent);
    background: var(--code-bg);
    color: var(--accent);
    font: 600 14px var(--font-ui);
    cursor: pointer;
  }
  .go:disabled {
    opacity: 0.4;
  }
  .problem {
    margin: 0;
    color: var(--danger);
    font-size: 13px;
  }
  .hint {
    margin: 0;
    color: var(--text-muted);
    font-size: 12px;
  }
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
    all: unset;
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: 9px 12px;
    cursor: pointer;
    font: 500 14px var(--font-code);
    color: var(--accent);
  }
  .list li + li {
    border-top: 1px solid var(--line);
  }
  .list .function {
    color: var(--text);
  }
  .list .rest {
    color: var(--text-muted);
  }
</style>
