/** Shared, reactive transport position for the UI (one rAF loop, many readers). */
export const transportClock = $state({
  playing: false,
  /** Position in seconds at the code's tempo (the tempo control scales real time). */
  seconds: 0,
});
