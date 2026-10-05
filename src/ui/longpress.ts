/**
 * Svelte action: call `onlong` after the pointer is held still on the node.
 * Moving more than a few pixels cancels (so drags still work), and the
 * click that follows a successful hold is swallowed (so it doesn't count
 * toward a double-tap). Adds `.holding` while the timer runs.
 * Presses that start on an interactive part (`.nodrag`, e.g. a wheel rim)
 * are left to that control.
 */
export interface LongPressOptions {
  onlong: () => void;
  ms?: number;
}

export function longpress(node: HTMLElement, options: LongPressOptions) {
  let opts = options;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sx = 0;
  let sy = 0;
  let fired = false;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    node.classList.remove('holding');
  };
  const down = (e: PointerEvent) => {
    if (e.button !== 0 || !e.isPrimary) return;
    if ((e.target as Element | null)?.closest?.('.nodrag')) return;
    fired = false;
    sx = e.clientX;
    sy = e.clientY;
    cancel();
    node.classList.add('holding');
    timer = setTimeout(() => {
      timer = undefined;
      fired = true;
      node.classList.remove('holding');
      navigator.vibrate?.(12);
      opts.onlong();
    }, opts.ms ?? 450);
  };
  const move = (e: PointerEvent) => {
    if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) cancel();
  };
  const click = (e: MouseEvent) => {
    if (!fired) return;
    fired = false;
    e.stopPropagation();
    e.preventDefault();
  };
  const menu = (e: Event) => e.preventDefault();

  node.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  // capture phase, so controls that stop propagation can't leave a timer running
  window.addEventListener('pointerup', cancel, true);
  window.addEventListener('pointercancel', cancel, true);
  node.addEventListener('click', click, true);
  node.addEventListener('contextmenu', menu);

  return {
    update(next: LongPressOptions) {
      opts = next;
    },
    destroy() {
      cancel();
      node.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', cancel, true);
      window.removeEventListener('pointercancel', cancel, true);
      node.removeEventListener('click', click, true);
      node.removeEventListener('contextmenu', menu);
    },
  };
}
