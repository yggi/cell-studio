<script lang="ts">
  /**
   * Shorten: what's written out longhand, offered shorter — each with what it
   * becomes and what it saves, and Apply. Worked out when asked (a long piece
   * takes a moment), and again after each change.
   */
  import { shorten, type Suggestion } from '@yggi/cells/engine/shorten/index';

  let { code, onapply }: { code: string; onapply: (next: string) => void } = $props();

  let open = $state(false);
  let list = $state<Suggestion[] | null>(null);
  let workedOn = '';
  // worked out when opened, and whenever the code changes while open
  $effect(() => {
    if (!open || code === workedOn) return;
    workedOn = code;
    list = null;
    const at = code;
    setTimeout(() => {
      if (at !== code) return;
      try {
        list = shorten(at);
      } catch {
        list = [];
      }
    }, 30);
  });
  const total = $derived(list?.reduce((a, s) => a + s.saving, 0) ?? 0);
</script>

<div class="shorten">
  <button class="unstyled toggle" aria-expanded={open} onclick={() => (open = !open)}>
    <span class="caret" aria-hidden="true">{open ? '▾' : '▸'}</span> Shorten
    {#if open && list}<span class="sum">{list.length ? `${list.length} · up to ${total} characters` : 'nothing to shorten'}</span>{/if}
  </button>
  {#if open}
    {#if !list}
      <p class="quiet">Reading the code…</p>
    {:else if list.length === 0}
      <p class="quiet">Nothing here is written out longer than it needs to be.</p>
    {:else}
      <ul>
        {#each list as s (s.id)}
          <li>
            <p class="what">{s.title}</p>
            <div class="change">
              <code class="was">{s.before}</code>
              <span class="arrow" aria-hidden="true">→</span>
              <code class="now">{s.after}</code>
            </div>
            <div class="row">
              <span class="saves">−{s.saving} characters</span>
              <button class="apply" onclick={() => onapply(s.apply(code))}>Apply</button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .shorten {
    border-top: 1px solid var(--line);
    padding: 6px 12px 10px;
    max-height: 45svh;
    overflow: auto;
  }
  .toggle {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 6px 0;
    font: 700 14px var(--font-ui);
    color: var(--text);
  }
  .caret {
    color: var(--text-muted);
    width: 1em;
  }
  .sum {
    font-weight: 500;
    font-size: 12.5px;
    color: var(--text-muted);
  }
  .quiet {
    margin: 4px 0;
    font-size: 13px;
    color: var(--text-muted);
  }
  ul {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  li {
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--surface);
    border: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .what {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.4;
  }
  .change {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
    font: 12.5px/1.45 var(--font-code);
  }
  .was {
    color: var(--text-muted);
    text-decoration: line-through;
    text-decoration-color: color-mix(in oklab, var(--danger) 60%, transparent);
    word-break: break-all;
  }
  .now {
    color: var(--tok-mod);
    word-break: break-all;
  }
  .arrow {
    color: var(--text-faint);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .saves {
    font: 600 12.5px var(--font-ui);
    color: var(--accent);
  }
  .apply {
    min-height: 32px;
    padding: 0 14px;
    border-radius: 16px;
    border: 1px solid var(--accent);
    background: none;
    color: var(--accent);
    font: 700 13px var(--font-ui);
    cursor: pointer;
  }
</style>
