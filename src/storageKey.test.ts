import { describe, expect, it } from 'vitest';
import { storageKey } from './storageKey';

describe('storageKey', () => {
  it('keeps the plain key for the app itself', () => {
    expect(storageKey('cell-studio-latency', '/cell-studio/')).toBe('cell-studio-latency');
    expect(storageKey('cell-studio-latency', '/cell-studio/index.html')).toBe('cell-studio-latency');
    expect(storageKey('cell-studio-latency', '/')).toBe('cell-studio-latency');
    expect(storageKey('cell-studio-latency', '')).toBe('cell-studio-latency');
  });
  it('gives a preview its own key', () => {
    expect(storageKey('cell-studio-latency', '/cell-studio/pr-12/')).toBe('pr-12/cell-studio-latency');
    expect(storageKey('cell-studio:engine', '/cell-studio/pr-7/index.html')).toBe('pr-7/cell-studio:engine');
  });
  it('is not fooled by names that only look like a preview', () => {
    expect(storageKey('k', '/cell-studio/pr-12')).toBe('k'); // (no trailing slash: not a folder)
    expect(storageKey('k', '/cell-studio/pr-x/')).toBe('k');
    expect(storageKey('k', '/cell-studio/apr-12/')).toBe('k');
  });
});
