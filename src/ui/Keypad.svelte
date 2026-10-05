<script lang="ts">
  /**
   * A free(…) with named choices, as a keypad: one key a value, the chosen one lit.
   * free(0, 0..30, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D") — a telephone's sixteen keys (every 2nd value).
   */
  let { labels, value, lo, hi, onpick, size = 'small' }: { labels: readonly string[]; value: number; lo: number; hi: number; onpick: (v: number) => void; size?: 'small' | 'large' } = $props();
  // (the names spread evenly over lo..hi: key i is lo + i × step)
  const step = $derived(labels.length > 1 ? (hi - lo) / (labels.length - 1) : 1);
  const at = (i: number) => lo + i * step;
  const cols = $derived(labels.length % 4 === 0 ? 4 : labels.length % 3 === 0 ? 3 : Math.ceil(Math.sqrt(labels.length)));
</script>

<div class="pad {size}" role="group" aria-label="Keypad" style:grid-template-columns="repeat({cols}, 1fr)">
  {#each labels as l, i (i)}
    <button class:on={Math.round(value) === at(i)} aria-pressed={Math.round(value) === at(i)} onclick={(e) => {
        e.stopPropagation(); // (a key, not a tap on its cell)
        onpick(at(i));
      }} onpointerdown={(e) => e.stopPropagation()}>{l}</button>
  {/each}
</div>

<style>
  .pad {
    display: grid;
    gap: 4px;
  }
  button {
    min-width: 0;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 700 13px var(--font-code);
    padding: 6px 0;
    cursor: pointer;
    transition: background 120ms ease, transform 80ms ease;
  }
  .large button {
    font-size: 18px;
    padding: 12px 0;
    border-radius: 12px;
  }
  button:active {
    transform: scale(0.94);
  }
  button.on {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
