<script lang="ts">
  /**
   * A cell's parameters as rows (`over &mode`, `step &bar` …); none on an empty
   * cell. Tap a row to edit it, + add for a new one — both in the shared
   * pop-up: the key, a smart line for the value, Delete.
   */
  import EditPop from './EditPop.svelte';
  import { PARAM_KEYS, suggestValue } from './suggest';
  import { SHOW_MEANING } from '../layout/show';
  import { attrsOf, setAttr, setTiming } from '../engine/edit';
  import { DOUGH_PARAMS, DOUGH_SOURCES } from '../engine/dough-params';
  import { parse } from '../engine/parser';

  let {
    name,
    source,
    names,
    shows = [],
    audio,
    onedit,
  }: {
    name: string;
    source: string;
    names: readonly string[];
    /** The shows that fit this cell (the picker for show=). */
    shows?: readonly string[];
    /** Loops at audio rate (loop= of 20 Hz or more): only then are sound parameters offered. */
    audio: boolean;
    onedit: (source: string) => void;
  } = $props();

  const attrs = $derived(attrsOf(source, name));
  const rows = $derived([...attrs].filter(([k]) => k !== 'off'));
  const allKeys = $derived<readonly [string, string][]>(audio ? [...PARAM_KEYS, ...Object.entries(DOUGH_PARAMS)] : PARAM_KEYS);
  const meaning = new Map<string, string>([...PARAM_KEYS, ...Object.entries(DOUGH_PARAMS)]);

  let editing = $state<{ key: string; from: string | null; value: string } | null>(null);
  // keys you can pick: the one being edited, and those not set yet (step and loop are one setting)
  const keys = $derived(
    allKeys
      .filter(
        ([k]) =>
          k === editing?.key ||
          k === editing?.from ||
          (!attrs.has(k) && !((k === 'step' || k === 'loop') && (attrs.has('step') || attrs.has('loop')) && editing?.from !== 'step' && editing?.from !== 'loop')),
      )
      .map(([k]) => ({ value: k, label: k })),
  );

  // show=: only the shows that fit this cell, with what each does
  const showChoices = (t: string) =>
    shows.filter((x) => x.startsWith(t.trim())).map((x) => ({ text: x, label: `${x} — ${SHOW_MEANING[x as keyof typeof SHOW_MEANING]}`, kind: 'value' as const }));
  function startAdd() {
    const first = allKeys.find(([k]) => !attrs.has(k) && !((k === 'step' || k === 'loop') && (attrs.has('step') || attrs.has('loop'))));
    if (first) editing = { key: first[0], from: null, value: '' };
  }
  function check(key: string, value: string) {
    return parse(`&probe ${key}=${value}`).diagnostics[0]?.message ?? null;
  }
  function apply(value: string) {
    if (!editing) return;
    const { key, from } = editing;
    let next = source;
    if (from && from !== key) next = setAttr(next, name, from, null);
    next = key === 'step' || key === 'loop' ? setTiming(next, name, key, value) : setAttr(next, name, key, value);
    editing = null;
    onedit(next);
  }
  function remove() {
    if (!editing?.from) return;
    const from = editing.from;
    editing = null;
    onedit(setAttr(source, name, from, null));
  }
</script>

<div class="rows">
  {#each rows as [k, v]}
    <button class="unstyled row" onclick={() => (editing = { key: k, from: k, value: v })} title={meaning.get(k)}>
      <span class="k">{k}</span>
      <span class="v">{v}</span>
    </button>
  {/each}
  <button class="unstyled add" onclick={startAdd}>Add a setting</button>
</div>

{#if editing}
  <EditPop
    label="value of {editing.key}"
    {keys}
    key={editing.key}
    onkey={(k) => editing && (editing = { ...editing, key: k })}
    text={editing.value}
    placeholder={meaning.get(editing.key) ?? ''}
    suggest={(t) => (editing?.key === 'show' ? showChoices(t) : suggestValue(editing?.key ?? '', t, names, Object.keys(DOUGH_SOURCES)))}
    actions={editing.from ? [{ label: 'Delete', danger: true, run: remove }] : []}
    check={(t) => check(editing?.key ?? '', t)}
    onapply={apply}
    onclose={() => (editing = null)}
  />
{/if}

<style>
  /* one list, its rows divided by hairlines */
  .rows {
    display: flex;
    flex-direction: column;
  }
  .row {
    display: grid;
    grid-template-columns: 5.2em 1fr;
    gap: 10px;
    align-items: center;
    min-height: 34px;
    padding: 0 10px;
    background: var(--code-bg);
    border-top: 1px solid color-mix(in oklab, var(--line) 60%, transparent);
    font: 500 13.5px var(--font-code);
  }
  .row:first-child {
    border-top: 0;
    border-radius: 8px 8px 0 0;
  }
  .row:last-of-type {
    border-radius: 0 0 8px 8px;
  }
  .row:only-of-type {
    border-radius: 8px;
  }
  .row:hover,
  .row:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: -1px;
  }
  .k {
    color: var(--text-muted);
  }
  .v {
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .add {
    align-self: flex-start;
    margin-top: 4px;
    padding: 6px 2px;
    color: var(--text-muted);
    font: 600 13.5px var(--font-ui);
  }
  .add:hover {
    color: var(--accent);
  }
</style>
