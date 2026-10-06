<script lang="ts">
  /**
   * The one editing pop-up, shared by braid steps and parameters: an optional
   * key, a smart line (with an optional value bar as its first line, and
   * completion as you type), optional spinners, and a couple of actions.
   * The line is checked as you type; Enter or a suggestion applies.
   */
  import type { Suggestion } from './suggest';
  import Dialog from './kit/Dialog.svelte';

  export interface BarItem {
    readonly text: string;
    readonly label: string;
    readonly style: string;
    readonly on: boolean;
  }
  export interface Spinner {
    readonly label: string;
    readonly down: () => void;
    readonly up: () => void;
  }
  export interface Action {
    readonly label: string;
    readonly danger?: boolean;
    readonly run: () => void;
  }

  let {
    label,
    keys = null,
    key = '',
    onkey,
    text: initial,
    placeholder = '',
    suggest,
    bar = [],
    spinners = [],
    actions = [],
    check,
    onapply,
    onclose,
  }: {
    label: string;
    /** A key to choose (parameters); null for none (steps). */
    keys?: readonly { value: string; label: string }[] | null;
    key?: string;
    onkey?: (key: string) => void;
    text: string;
    placeholder?: string;
    suggest: (text: string) => Suggestion[];
    bar?: readonly BarItem[];
    spinners?: readonly Spinner[];
    actions?: readonly Action[];
    /** Why the text won't do (shown, and blocks applying), or null. */
    check: (text: string) => string | null;
    onapply: (text: string) => void;
    onclose: () => void;
  } = $props();

  // (a new text to edit, from outside: shown as it is, and not being typed)
  let text = $derived(initial);
  let typing = $derived.by(() => {
    void initial;
    return false;
  });
  const suggestions = $derived(typing ? suggest(text) : []);
  const problem = $derived(text.trim() ? check(text.trim()) : null);
  function apply(t: string) {
    typing = false;
    text = t;
    if (!check(t.trim())) onapply(t.trim());
  }
</script>

<Dialog {label} {onclose}>
  <div class="field">
    {#if keys}
      <select aria-label="parameter" value={key} onchange={(e) => onkey?.(e.currentTarget.value)}>
        {#each keys as k}<option value={k.value}>{k.label}</option>{/each}
      </select>
    {/if}
    <!-- svelte-ignore a11y_autofocus -->
    <input
      bind:value={text}
      aria-label={label}
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      autofocus={!!keys}
      {placeholder}
      oninput={() => (typing = true)}
      onkeydown={(e) => {
        if (e.key === 'Enter') apply(typing && suggestions[0] ? suggestions[0].text : text);
        if (e.key === 'Escape') onclose();
      }}
    />
    <button class="x" onclick={onclose} aria-label="Close">×</button>
  </div>
  {#if problem}<p class="problem">{problem}</p>{/if}

  {#if bar.length}
    <div class="bar" role="group" aria-label="values">
      {#each bar as b}
        <button class="val" class:on={b.on} style={b.style} onclick={() => apply(b.text)}>{b.label}</button>
      {/each}
    </div>
  {/if}

  {#if suggestions.length}
    <ul class="list" role="listbox" aria-label="suggestions">
      {#each suggestions as s}
        <li><button class={s.kind} onclick={() => apply(s.text)}>{s.label}</button></li>
      {/each}
    </ul>
  {/if}

  {#if spinners.length || actions.length}
    <div class="row">
      {#each spinners as sp}
        <span class="spin" role="group" aria-label={sp.label}>
          <button onclick={sp.down} aria-label="{sp.label} down">−</button>
          <span>{sp.label}</span>
          <button onclick={sp.up} aria-label="{sp.label} up">+</button>
        </span>
      {/each}
      <span class="extra">
        {#each actions as a}<button class:danger={a.danger} onclick={a.run}>{a.label}</button>{/each}
      </span>
    </div>
  {/if}
</Dialog>

<style>
  .field {
    display: flex;
    gap: 6px;
  }
  .field input,
  .field select {
    min-height: 44px;
    padding: 0 10px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 600 16px var(--font-code);
  }
  .field select {
    flex: 0 0 auto;
    max-width: 8.5em;
  }
  .field input {
    flex: 1;
    min-width: 0;
    border-color: var(--accent);
  }
  .x {
    all: unset;
    cursor: pointer;
    font-size: 24px;
    color: var(--text-muted);
    padding: 0 8px;
  }
  .problem {
    margin: 0;
    color: var(--danger);
    font-size: 13px;
  }
  .bar {
    display: flex;
    gap: 3px;
    overflow-x: auto;
  }
  .val {
    flex: 1 0 26px;
    min-height: 36px;
    border-radius: 6px;
    border: 2px solid transparent;
    background: var(--code-bg);
    color: var(--ink-on-note);
    font: 700 13px var(--font-code);
    cursor: pointer;
    padding: 0;
  }
  .val.on {
    border-color: var(--text);
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
  .list .function,
  .list .value {
    color: var(--text);
  }
  .list .rest {
    color: var(--text-muted);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .spin {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }
  .spin button,
  .extra button {
    min-width: 36px;
    min-height: 36px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 600 14px var(--font-ui);
    cursor: pointer;
  }
  .extra {
    margin-left: auto;
    display: inline-flex;
    gap: 6px;
  }
  .extra button {
    padding: 0 10px;
  }
  .extra .danger {
    border-color: var(--danger);
    color: var(--danger);
  }
</style>
