/// <reference lib="webworker" />
// The engine in a worker (#15): engine/host.ts answering the main thread's messages (audio/engine.ts).
import { createHost, type ToEngine } from '../engine/host';

const host = createHost();
self.onmessage = (e: MessageEvent<ToEngine>) => {
  const reply = host(e.data);
  if (reply) self.postMessage(reply);
};
