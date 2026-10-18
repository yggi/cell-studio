import { describe, expect, it } from 'vitest';
import { strip, STRIP_MAX, STRIP_MIN } from './strip.svelte';

describe("the tower strip's width (#440): one for both views", () => {
  it('is held between collapsed and its widest', () => {
    strip.resize(1000);
    expect(strip.width).toBe(STRIP_MAX);
    strip.resize(1);
    expect(strip.width).toBe(STRIP_MIN);
  });

  it('collapses, and opens again to the width it had', () => {
    strip.resize(220);
    strip.toggle();
    expect(strip.width).toBe(STRIP_MIN);
    strip.toggle();
    expect(strip.width).toBe(220);
  });
});
