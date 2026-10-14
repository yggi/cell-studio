<script lang="ts">
  import { noteColour } from './theme';
  /** One step of a braid, in the shared pop-up: value bar, completion, step/octave spinners, Split, Delete. */
  import EditPop from './EditPop.svelte';
  import { nudge, numberToken, suggest } from './suggest';
  import { parse } from '@yggi/cells/engine/parser/index';

  let {
    token,
    names,
    hueOf,
    lap,
    onapply,
    onsplit,
    ondelete,
    onclose,
  }: {
    token: string;
    names: readonly string[];
    hueOf: (token: string) => number[] | null;
    lap: number;
    onapply: (token: string) => void;
    onsplit: () => void;
    ondelete: () => void;
    onclose: () => void;
  } = $props();

  const num = $derived(numberToken(token));
  const mods = $derived(num?.mods ?? /((?:[!*@]\d+)*)$/.exec(token)?.[1] ?? '');
  const base = $derived(num ? Math.floor(num.value / lap) * lap : 0);
  const swatch = (t: string) => {
    const h = hueOf(t);
    return h?.length ? `background: ${noteColour(h[0])}` : '';
  };
  const bar = $derived([
    ...Array.from({ length: lap }, (_, i) => base + i).map((v) => ({ text: `${v}${num?.acc ?? ''}${mods}`, label: String(v), style: swatch(String(v)), on: num?.value === v })),
    { text: `~${mods}`, label: '~', style: '', on: token.startsWith('~') },
  ]);
  const check = (t: string) => {
    const r = parse(`&probe ${t}`);
    const c = r.cells[0];
    if (r.diagnostics.length) return r.diagnostics[0].message;
    return c?.braid.kind === 'list' && c.braid.tokens.length === 1 ? null : 'One step here — tap the hub to write several';
  };
</script>

<EditPop
  label="step"
  text={token}
  suggest={(t) => (numberToken(t) ? [] : suggest(t, names).map((s) => (s.kind === 'bracket' ? s : { ...s, text: s.text + mods })))}
  {bar}
  spinners={num
    ? [
        { label: 'step', down: () => onapply(nudge(token, -1)), up: () => onapply(nudge(token, 1)) },
        { label: 'octave', down: () => onapply(nudge(token, -lap)), up: () => onapply(nudge(token, lap)) },
      ]
    : []}
  actions={[
    { label: 'Split', run: onsplit },
    { label: 'Delete', danger: true, run: ondelete },
  ]}
  {check}
  {onapply}
  {onclose}
/>
