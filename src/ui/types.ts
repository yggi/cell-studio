import type { Node } from '@xyflow/svelte';

/** petal: an unnamed cell, drawn small hanging from its parent (no label, no edges). */
type CellNodeData = {
  name: string;
  isMeter: boolean;
  size: number;
  pinned: boolean;
  petal?: boolean;
  /** A meter's own place among the piece's meters (its colour). */
  meterIndex?: number;
  /** How far its bulbs reach below its wheel (px): its name goes under them (#221). */
  below?: number;
};
type VoiceNodeData = { name: string; summary: string; size: number; pinned: boolean; petal?: boolean };
export type CellFlowNode = Node<CellNodeData, 'cell'>;
export type VoiceFlowNode = Node<VoiceNodeData, 'voice'>;
/** A physical cell (a motor's meter, a belted cell): a turntable. */
type MaterialNodeData = {
  name: string;
  size: number;
  role: 'motor' | 'belt' | 'tape' | 'resonator';
  pinned: boolean;
  /** A tape's turn, degrees: where the layout faced its write head (layout/tape.ts). */
  turn?: number;
};
type MaterialFlowNode = Node<MaterialNodeData, 'material'>;
/** A cell drawn by a plugin of the piece (show=name). */
type PluginFlowNode = Node<{ name: string; size: number; plugin: string }, 'plugin'>;

/** A product's junction (graph.ts): the voice it is and the mix it goes into (`name`: its id, no cell's). */
type JunctionNodeData = { name: string; voice: string; mix: string; size: number };
export type JunctionFlowNode = Node<JunctionNodeData, 'junction'>;
export type FlowNode = CellFlowNode | VoiceFlowNode | MaterialFlowNode | PluginFlowNode | JunctionFlowNode;
