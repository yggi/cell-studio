import type { TransportState } from './transport';

/** Shared, reactive transport position for the UI (one rAF loop, many readers). */
export const transportClock = $state<{ state: TransportState; seconds: number }>({
  /** Stopped, paused or playing (audio/transport.ts); the Player is the only one to change it. */
  state: 'stopped',
  /** Position in seconds at the code's tempo (the tempo control scales real time), while playing. */
  seconds: 0,
});
