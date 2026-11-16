<script lang="ts">
  import { tokenize, withLinks } from './highlight';
  import type { Diagnostic } from '@yggi/cells/engine/ast';
  import { facetColour } from './theme';
  import { FACETS, fragmentCard, type ChainStep, type Link } from '../references';
  import RefCard from './RefCard.svelte';
  import { mine } from '../mine.svelte';
  import SuggestList from './SuggestList.svelte';
  import type { Suggestion } from './suggest';

  let {
    value = $bindable(),
    diagnostics,
    readonly = false,
    links = [],
    chain,
    onfollow,
    complete,
  }: {
    value: string;
    diagnostics: readonly Diagnostic[];
    /** Shown, not written: a session host's text (#478). */
    readonly?: boolean;
    /** Its `from` ids, painted as links, each line's facet a dot in the gutter (#624). */
    links?: readonly Link[];
    /** A given name's chain (`&hh`: the fragment that defines it, each line that took it on), or null for the piece's own. */
    chain?: (name: string) => readonly ChainStep[] | null;
    /** Follow a link: open its fragment (⌘/Ctrl-click, or the card's), and play it. */
    onfollow?: (id: string, play: boolean) => void;
    /**
     * What the word at the caret could become, from its line up to the caret (`from ` and an id: #624), and where it
     * starts; null for nothing. `others`: the text without the caret's line (what the line is in, as it compiles).
     */
    complete?: (before: string, others: string) => { readonly start: number; readonly suggestions: readonly Suggestion[] } | null;
  } = $props();

  let textarea: HTMLTextAreaElement;
  let gutter: HTMLDivElement;
  let mirror: HTMLDivElement;
  let paint: HTMLPreElement;

  const lines = $derived(value.split('\n'));
  const lineCount = $derived(lines.length);
  // the code, coloured: a copy under the textarea (whose text is transparent), wrapped the same way
  const painted = $derived.by(() => {
    const byLine = new Map<number, Link[]>();
    for (const l of links) (byLine.get(l.line) ?? byLine.set(l.line, []).get(l.line)!).push(l);
    return lines.map((line, i) => withLinks(tokenize(line), byLine.get(i + 1) ?? []));
  });
  // (a `from` line's facet: its dot in the gutter)
  const dots = $derived(new Map(links.flatMap((l) => (l.facet ? [[l.line, facetColour(l.facet, FACETS)] as const] : []))));

  // what the pointer is over, in the coloured copy (which takes no pointer: the textarea over it does), once a frame at most
  let hovered = $state<{ kind: 'link'; id: string; x: number; y: number } | { kind: 'name'; name: string; steps: readonly ChainStep[]; x: number; y: number } | null>(null);
  function under(x: number, y: number): HTMLElement | null {
    paint.style.pointerEvents = 'auto';
    textarea.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y);
    paint.style.pointerEvents = textarea.style.pointerEvents = '';
    return el instanceof HTMLElement && paint.contains(el) ? el : null;
  }
  let frame = 0;
  let leave: ReturnType<typeof setTimeout> | undefined;
  function onpointermove(e: PointerEvent) {
    if (e.pointerType !== 'mouse' || frame) return;
    const [x, y] = [e.clientX, e.clientY];
    frame = requestAnimationFrame(() => {
      frame = 0;
      const el = under(x, y);
      const box = editor.getBoundingClientRect();
      const r = el?.getBoundingClientRect();
      const at = r ? { x: r.left - box.left, y: r.bottom - box.top + 4 } : null;
      const id = el?.dataset.link;
      const name = el?.dataset.name;
      const steps = name && chain ? chain(name) : null;
      clearTimeout(leave);
      if (at && id) hovered = hovered?.kind === 'link' && hovered.id === id ? hovered : { kind: 'link', id, ...at };
      else if (at && name && steps) hovered = hovered?.kind === 'name' && hovered.name === name ? hovered : { kind: 'name', name, steps, ...at };
      // (a moment to reach the card before it goes)
      else if (hovered) leave = setTimeout(() => (hovered = null), 250);
      textarea.style.cursor = id && (e.metaKey || e.ctrlKey) ? 'pointer' : '';
    });
  }
  // ⌘/Ctrl-click a link: its fragment, opened
  function onmousedown(e: MouseEvent) {
    if (!onfollow || !(e.metaKey || e.ctrlKey)) return;
    const id = under(e.clientX, e.clientY)?.dataset.link;
    if (!id) return;
    e.preventDefault();
    hovered = null;
    onfollow(id, false);
  }

  // zoom: smaller on a phone, A− / A+ or two fingers to change it
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  let size = $state(coarse ? 13 : 15);
  const zoom = (by: number) => (size = Math.min(22, Math.max(10, Math.round((size + by) * 2) / 2)));

  // lines wrap: each gutter number is as tall as its line, wrapped (measured on a hidden mirror)
  let heights = $state<number[]>([]);

  // completion at the caret: the list, the one Enter takes, and where the word starts in the text
  let offered = $state<{ suggestions: readonly Suggestion[]; from: number; line: number; active: number; scroll: number } | null>(null);
  function offer() {
    if (!complete || readonly || textarea.selectionStart !== textarea.selectionEnd) return void (offered = null);
    // (the textarea's own text: `value` follows it through the binding, which may not have run yet)
    const text = textarea.value;
    const at = textarea.selectionStart;
    const lineStart = text.lastIndexOf('\n', at - 1) + 1;
    const lineEnd = text.indexOf('\n', at);
    const c = complete(text.slice(lineStart, at), text.slice(0, lineStart) + (lineEnd < 0 ? '' : text.slice(lineEnd + 1)));
    offered =
      c && c.suggestions.length
        ? { suggestions: c.suggestions, from: lineStart + c.start, line: text.slice(0, lineStart).split('\n').length, active: 0, scroll: textarea.scrollTop }
        : null;
  }
  function take(s: Suggestion) {
    if (!offered) return;
    const at = textarea.selectionStart;
    const from = offered.from;
    value = textarea.value.slice(0, from) + s.text + textarea.value.slice(at);
    offered = null;
    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(from + s.text.length, from + s.text.length);
    });
  }
  // (under the caret's line: its top, the lines above it as wrapped, less the scroll)
  const offeredTop = $derived(offered ? heights.slice(0, offered.line).reduce((a, h) => a + h, 0) + 8 - offered.scroll : 0);
  function measure() {
    if (!mirror || !textarea) return;
    const cs = getComputedStyle(textarea);
    mirror.style.width = `${textarea.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)}px`;
    // the coloured copy: exactly the textarea's text area (a scrollbar narrows it)
    if (paint) paint.style.width = `${textarea.clientWidth}px`;
    heights = Array.from(mirror.children, (el) => (el as HTMLElement).getBoundingClientRect().height);
    // (the text replaced, the code where it was: the textarea's scroll kept, as far as the new text reaches, and the
    // gutter and the coloured copy with it, which follow it only as it scrolls: a session's next section, #493)
    if (kept !== null) textarea.scrollTop = kept;
    kept = null;
    gutter.scrollTop = paint.scrollTop = textarea.scrollTop;
  }
  // (where the code was scrolled to as its text changed: kept across the change)
  let kept: number | null = null;
  $effect.pre(() => {
    void value;
    if (textarea && kept === null) kept = textarea.scrollTop;
  });
  $effect(() => {
    void lines;
    void size;
    queueMicrotask(measure);
  });
  $effect(() => {
    const ro = new ResizeObserver(() => measure());
    ro.observe(textarea);
    return () => ro.disconnect();
  });

  // two-finger pinch on the code: zoom
  let pinch: number | null = null;
  const spread = (e: TouchEvent) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  function touchstart(e: TouchEvent) {
    if (e.touches.length === 2) pinch = spread(e);
  }
  function touchmove(e: TouchEvent) {
    if (pinch === null || e.touches.length !== 2) return;
    e.preventDefault();
    const d = spread(e);
    if (Math.abs(d - pinch) > 24) {
      zoom(d > pinch ? 1 : -1);
      pinch = d;
    }
  }
  const touchend = () => (pinch = null);
  // (non-passive, so a pinch zooms the code rather than the page)
  let editor: HTMLDivElement;
  $effect(() => {
    const opts = { passive: false } as const;
    editor.addEventListener('touchstart', touchstart, opts);
    editor.addEventListener('touchmove', touchmove, opts);
    editor.addEventListener('touchend', touchend);
    return () => {
      editor.removeEventListener('touchstart', touchstart);
      editor.removeEventListener('touchmove', touchmove);
      editor.removeEventListener('touchend', touchend);
    };
  });
  const marks = $derived.by(() => {
    // (a line's mark is its gravest: an error over a warning, a warning over an info, cells' silence said, decision 063)
    const rank = { error: 2, warning: 1, info: 0 } as const;
    const m = new Map<number, Diagnostic['severity']>();
    for (const d of diagnostics) {
      const was = m.get(d.span.line);
      if (was === undefined || rank[d.severity] > rank[was]) m.set(d.span.line, d.severity);
    }
    return m;
  });

  function select(line: number, col: number, len: number) {
    const lines = value.split('\n');
    let offset = col - 1;
    for (let i = 0; i < line - 1; i++) offset += lines[i].length + 1;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(offset, offset + len);
    // bring the line into view inside the textarea (lines wrap: add up their heights), then the editor into the page
    const above = heights.slice(0, Math.max(0, line - 3)).reduce((a, h) => a + h, 0);
    textarea.scrollTop = above;
    textarea.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function jump(d: Diagnostic) {
    select(d.span.line, d.span.col, d.span.len);
  }

  /** The lines a selection spans (1-based, in order), or none for a caret alone: what "Turn into a fragment" takes (#626). */
  export function selectedLines(): number[] {
    const { selectionStart: a, selectionEnd: b } = textarea;
    if (a === b) return [];
    const line = (at: number) => textarea.value.slice(0, at).split('\n').length;
    // (a selection ending at a line's start doesn't take that line)
    const last = line(b) - (textarea.value[b - 1] === '\n' ? 1 : 0);
    return Array.from({ length: Math.max(0, last - line(a) + 1) }, (_, i) => line(a) + i);
  }
  /** Select a whole line (1-based) — the graph's "show in code". */
  export function showLine(line: number) {
    const text = value.split('\n')[line - 1] ?? '';
    select(line, 1, text.length);
  }

  // Android's on-screen keyboard: once the viewport has shrunk, keep the caret visible
  function onfocus() {
    setTimeout(() => textarea.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 350);
  }

  function onkeydown(e: KeyboardEvent) {
    if (offered) {
      const n = offered.suggestions.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        offered.active = (offered.active + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        take(offered.suggestions[offered.active]!);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        offered = null;
        return;
      }
    }
    if (e.key !== 'Tab' || e.shiftKey || readonly) return;
    e.preventDefault();
    const { selectionStart: s, selectionEnd: t } = textarea;
    value = value.slice(0, s) + '  ' + value.slice(t);
    queueMicrotask(() => textarea.setSelectionRange(s + 2, s + 2));
  }
</script>

<div class="editor" role="group" aria-label="Code" style="--size: {size}px" bind:this={editor}>
  <div class="gutter" bind:this={gutter} aria-hidden="true">
    {#each { length: lineCount } as _, i}
      <div class={marks.get(i + 1)} style:height={heights[i] ? `${heights[i]}px` : undefined}>
        {#if dots.has(i + 1)}<span class="dot" style:background={dots.get(i + 1)}></span>{/if}{i + 1}
      </div>
    {/each}
  </div>
  <div class="code">
    <pre class="paint" bind:this={paint} aria-hidden="true">{#each painted as line, i}{#each line as t}{#if t.link}<span class="t-{t.kind} link" data-link={t.link}>{t.text}</span
            >{:else if t.kind === 'ref' && /^&\w+$/.test(t.text)}<span class="t-ref" data-name={t.text.slice(1)}>{t.text}</span>{:else}<span class="t-{t.kind}">{t.text}</span
            >{/if}{/each}{i < painted.length - 1 ? '\n' : '\n '}{/each}</pre>
    <textarea
      bind:this={textarea}
      bind:value
      {readonly}
      {onkeydown}
      {onfocus}
      {onpointermove}
      {onmousedown}
      oninput={offer}
      onblur={() => (offered = null)}
      onclick={() => (offered = null)}
      onpointerleave={() => (leave = setTimeout(() => (hovered = null), 250))}
      onscroll={() => {
        gutter.scrollTop = textarea.scrollTop;
        paint.scrollTop = textarea.scrollTop;
      }}
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      wrap="soft"
      aria-label="Cell program"></textarea>
  </div>
  <!-- the same lines, laid out like the textarea, to measure where they wrap -->
  <div class="mirror" bind:this={mirror} aria-hidden="true">
    {#each lines as l}<div>{l || '\u200b'}</div>{/each}
  </div>
  {#if offered}
    <!-- completion at the caret (#624): ↑ ↓ to choose, Enter or Tab to take, Esc to close -->
    <div class="offered" style:top="{offeredTop}px">
      <SuggestList suggestions={offered.suggestions} active={offered.active} onpick={take} label="Fragments" />
    </div>
  {/if}
  {#if hovered}
    <!-- (the card stays while the pointer is on it: its ▶ is a button) -->
    <div class="hover" style:left="{hovered.x}px" style:top="{hovered.y}px" role="tooltip" onpointerenter={() => clearTimeout(leave)} onpointerleave={() => (hovered = null)}>
      {#if hovered.kind === 'link'}
        <RefCard card={fragmentCard(hovered.id, mine.entries)} id={hovered.id} onplay={onfollow && ((id) => ((hovered = null), onfollow(id, true)))} />
      {:else}
        <RefCard name={hovered.name} steps={hovered.steps} />
      {/if}
    </div>
  {/if}
  <div class="zoom" role="group" aria-label="Text size">
    <button type="button" class="unstyled" onclick={() => zoom(-1)} aria-label="Smaller text">A−</button>
    <button type="button" class="unstyled" onclick={() => zoom(1)} aria-label="Larger text">A+</button>
  </div>
</div>

{#if diagnostics.length > 0}
  <ul class="diagnostics" aria-live="polite">
    {#each diagnostics as d}
      <li class={d.severity}>
        <button type="button" class="unstyled" onclick={() => jump(d)}>
          <span class="where">Line {d.span.line}</span>
          {d.message}
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .editor {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    /* the hidden mirror below is as tall as the whole text: it must not stretch the page (dead space under it) */
    overflow: clip;
    background: var(--code-bg);
    --lh: 1.55;
    font: var(--size) / var(--lh) var(--font-code);
  }
  .gutter {
    flex: none;
    width: 2.6em;
    padding: var(--space-2) 0;
    overflow: hidden;
    text-align: right;
    color: var(--text-faint);
    user-select: none;
    font-variant-numeric: tabular-nums;
    font-size: 0.85em;
    line-height: calc(var(--lh) / 0.85);
  }
  .gutter div {
    box-sizing: border-box;
    padding-right: 6px;
    border-right: 3px solid transparent;
  }
  .gutter .dot {
    display: inline-block;
    width: 0.5em;
    height: 0.5em;
    margin-right: 0.35em;
    border-radius: 50%;
    vertical-align: 0.1em;
  }
  .link {
    text-decoration: underline dotted;
    text-underline-offset: 3px;
  }
  .offered {
    position: absolute;
    left: 3em;
    z-index: 6;
    width: min(360px, calc(100% - 4em));
    background: var(--surface);
    border-radius: 8px;
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.35);
  }
  .hover {
    position: absolute;
    z-index: 5;
    max-width: min(340px, calc(100% - 16px));
  }
  .gutter .error {
    color: var(--danger);
    border-right-color: var(--danger);
  }
  .gutter .warning {
    color: var(--warning);
    border-right-color: var(--warning);
  }
  .gutter .info {
    color: var(--text-muted);
    border-right-color: var(--text-muted);
  }
  textarea,
  .paint,
  .mirror {
    margin: 0;
    padding: var(--space-2) var(--space-3) var(--space-2) var(--space-2);
    font: inherit;
    line-height: var(--lh);
    tab-size: 2;
    /* lines wrap at the edge — anywhere, if they must */
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .code {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
  }
  /* the coloured copy, under the textarea: same box, same wrapping, scrolled with it */
  .paint {
    position: absolute;
    inset: 0 auto 0 0;
    overflow: hidden;
    pointer-events: none;
    color: var(--code);
    box-sizing: border-box;
  }
  .t-comment {
    color: var(--tok-comment);
    font-style: italic;
  }
  .t-string {
    color: var(--tok-string);
  }
  .t-ref {
    color: var(--tok-ref);
  }
  .t-attr {
    color: var(--tok-attr);
  }
  .t-func {
    color: var(--tok-func);
  }
  .t-note {
    color: var(--tok-note);
  }
  .t-num {
    color: var(--tok-num);
  }
  .t-rest,
  .t-punct {
    color: var(--tok-punct);
  }
  .t-mod {
    color: var(--tok-mod);
  }
  .t-word {
    color: var(--tok-word);
  }
  textarea {
    position: relative;
    flex: 1;
    min-width: 0;
    border: 0;
    resize: none;
    background: transparent;
    /* the text is the coloured copy beneath; the caret and the selection stay */
    color: transparent;
    -webkit-text-fill-color: transparent;
    overflow-x: hidden;
    overflow-y: auto;
    caret-color: var(--accent);
  }
  textarea::selection {
    background: color-mix(in oklab, var(--accent) 30%, transparent);
  }
  textarea:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .mirror {
    position: absolute;
    visibility: hidden;
    pointer-events: none;
    left: 0;
    top: 0;
    box-sizing: content-box;
    padding: 0;
  }
  .zoom {
    position: absolute;
    right: var(--space-2);
    bottom: var(--space-2);
    display: flex;
    gap: 2px;
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    border: 1px solid var(--line);
    opacity: 0.85;
  }
  .zoom button {
    padding: 4px 10px;
    font: 700 12px var(--font-ui);
    color: var(--text-muted);
  }
  .zoom button:hover,
  .zoom button:focus-visible {
    color: var(--accent);
  }
  .diagnostics {
    list-style: none;
    margin: 0;
    padding: var(--space-1);
    max-height: 26%;
    overflow: auto;
    background: var(--surface);
    border-top: 1px solid var(--line);
  }
  .diagnostics button {
    box-sizing: border-box;
    display: block;
    width: 100%;
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    line-height: 1.4;
    color: var(--text);
  }
  .diagnostics button:hover,
  .diagnostics button:focus-visible {
    background: var(--surface-2);
  }
  .diagnostics button:focus-visible {
    outline: 2px solid var(--accent);
  }
  .where {
    font-weight: 700;
    margin-right: 6px;
  }
  .error .where {
    color: var(--danger);
  }
  .warning .where {
    color: var(--warning);
  }
  .info .where {
    color: var(--text-muted);
  }
</style>
