/// <reference lib="webworker" />
// The engine in a worker (#15): engine/host.ts answering the main thread's messages (audio/engine.ts).
import type { ToEngine } from '@yggi/cells';
import { workerHost, type MineMessage } from './engine';

const host = workerHost();
self.onmessage = (e: MessageEvent<ToEngine | MineMessage>) => {
  const reply = host(e.data);
  if (reply) self.postMessage(reply);
};
