import type { MeterRing } from '../layout/meters';
import type { Node } from '@xyflow/svelte';

/** petal: an unnamed cell, drawn small hanging from its parent (no label, no edges). */
export type CellNodeData = {
  name: string;
  isMeter: boolean;
  size: number;
  pinned: boolean;
  petal?: boolean;
  /** The meter that steps it (its edge isn't drawn: layout/meters.ts): which, and at what rate. */
  ring?: MeterRing;
  /** A meter's own place among the piece's meters (its colour). */
  meterIndex?: number;
};
export type VoiceNodeData = { name: string; summary: string; size: number; pinned: boolean; petal?: boolean };
export type CellFlowNode = Node<CellNodeData, 'cell'>;
export type VoiceFlowNode = Node<VoiceNodeData, 'voice'>;
/** A physical cell (a motor's meter, a belted cell): a turntable. */
export type MaterialNodeData = {
  name: string;
  size: number;
  role: 'motor' | 'belt' | 'tape' | 'resonator';
  pinned: boolean;
  /** A tape's turn, degrees: where the layout faced its write head (layout/tape.ts). */
  turn?: number;
};
export type MaterialFlowNode = Node<MaterialNodeData, 'material'>;
/** An oscilloscope (scope=): a screen. */
export type ScopeNodeData = { name: string; size: number };
export type ScopeFlowNode = Node<ScopeNodeData, 'scope'>;
/** The sun of a day's law (sun=): a 24-hour dial. */
export type SunFlowNode = Node<ScopeNodeData, 'sun'>;
export type FlowNode = CellFlowNode | VoiceFlowNode | MaterialFlowNode | ScopeFlowNode | SunFlowNode;
