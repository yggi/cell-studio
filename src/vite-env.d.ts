/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** What this build is: commit, branch, date, dependencies (src/buildInfo.ts; vite.config.ts fills it). */
declare const __BUILD__: import('./buildInfo').BuildInfo;

/** Chromium's heap size, not in lib.dom (and not in every browser): the perf report's samples read it. */
interface Performance {
  readonly memory?: { readonly usedJSHeapSize: number };
}

/** A long-animation-frame entry (Chromium), not yet in lib.dom; each field may be missing. */
interface PerformanceLongAnimationFrameTiming extends PerformanceEntry {
  readonly blockingDuration?: number;
  readonly scripts?: readonly { readonly invoker?: string; readonly invokerType?: string }[];
}

/** The examples' index, made at build time (tools/examples-index.ts). */
declare module 'virtual:examples-index' {
  // (an ExampleInfo[]: src/examples.ts types it; a relative import can't be named here)
  const index: readonly unknown[];
  export default index;
}
