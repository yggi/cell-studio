/**
 * The localStorage key for a setting kept in this browser. A PR preview (`…/pr-12/`) shares the origin with the
 * app and every other preview, so its settings get their own keys (`pr-12/cell-studio-latency`); the app itself
 * keeps the plain keys, so nothing it kept before is lost. Saved pieces (`library.ts`) get their own keys too: a PR
 * that changes how pieces are saved can't touch yours (bring one over as a .cells file).
 */
export function storageKey(key: string, path: string = typeof location === 'undefined' ? '' : location.pathname): string {
  const preview = /\/(pr-\d+)\//.exec(path)?.[1];
  return preview ? `${preview}/${key}` : key;
}
