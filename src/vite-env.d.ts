/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** The app's version and build, from package.json and git (see vite.config.ts). */
declare const __APP_VERSION__: string;

/** The examples' index, made at build time (tools/examples-index.ts). */
declare module 'virtual:examples-index' {
  // (an ExampleInfo[]: src/examples.ts types it; a relative import can't be named here)
  const index: readonly unknown[];
  export default index;
}
