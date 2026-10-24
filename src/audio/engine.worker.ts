/// <reference lib="webworker" />
// The engine in a worker (#15): engine/host.ts answering the main thread's messages (audio/engine.ts).
import type { ToEngine } from '@yggi/cells/engine/host';
import { workerHost } from './engine';

const host = workerHost();
self.onmessage = (e: MessageEvent<ToEngine>) => {
  const reply = host(e.data);
  if (reply) self.postMessage(reply);
};
