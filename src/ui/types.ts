import type { Node } from '@xyflow/svelte';
import type { Module } from '../layout/modules';

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
  /** A module's head (decision 069): its jacks on its rim. */
  module?: Module;
};
type VoiceNodeData = {
  name: string;
  summary: string;
  size: number;
  pinned: boolean;
  petal?: boolean;
  /** A module's head (decision 069): its jacks on its rim. */ module?: Module;
};
/** An instrument module (decision 069: `lowpass`, `highpass`, `amp`), one wheel, its face and its jacks. */
type ModuleNodeData = { name: string; size: number; pinned: boolean; module: Module };
export type ModuleFlowNode = Node<ModuleNodeData, 'module'>;
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

/** A product's junction (graph.ts): the voice it plays, the mix it goes into (`name`: its id, no cell's), and what its meter draws. */
type JunctionNodeData = { name: string; voice: string; mix: string; size: number; notes: string | null; levels: readonly string[]; gain: number };
export type JunctionFlowNode = Node<JunctionNodeData, 'junction'>;
/** A socket into the sound card (the tower layout): the edge it ends, whose sound that is. */
type SocketFlowNode = Node<{ name: string; edge: string; source: string; size: number; /** On a MIDI card: its channel. */ channel: number | null }, 'socket'>;
export type FlowNode = CellFlowNode | VoiceFlowNode | MaterialFlowNode | PluginFlowNode | JunctionFlowNode | SocketFlowNode | ModuleFlowNode;
