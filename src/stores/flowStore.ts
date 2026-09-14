import { defineStore } from "pinia";
import { findNodeById } from "../utils/nodeUtils";
import type {
  Flow,
  FlowEdge,
  FlowNode,
  FlowNodeData,
  Position,
} from "../types";

const MAX_HISTORY = 50;

interface MoveHistoryEntry {
  kind: "move";
  nodeId: string;
  from: Position;
  to: Position;
}

interface EditHistoryEntry {
  kind: "edit";
  nodeId: string;
  from: FlowNodeData;
  to: FlowNodeData;
}

type HistoryEntry = MoveHistoryEntry | EditHistoryEntry;

interface FlowStoreState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  initialized: boolean;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
}

/**
 * Holds the canonical in-memory flow state (nodes/edges) plus UI concerns
 * (selection, undo/redo for node moves and edits). TanStack Query owns the
 * fetch/mutate lifecycle against the "server"; this store is the local
 * source of truth the canvas renders from, kept in sync with query
 * results/mutation responses.
 */
export const useFlowStore = defineStore("flow", {
  state: (): FlowStoreState => ({
    nodes: [],
    edges: [],
    initialized: false,
    undoStack: [],
    redoStack: [],
  }),

  getters: {
    getNode:
      (state) =>
      (id: string): FlowNode | null =>
        findNodeById(state.nodes, id),
    canUndo: (state): boolean => state.undoStack.length > 0,
    canRedo: (state): boolean => state.redoStack.length > 0,
  },

  actions: {
    setFlow({ nodes, edges }: Flow) {
      this.nodes = nodes;
      this.edges = edges;
      this.initialized = true;
    },

    addNode(node: FlowNode) {
      this.nodes.push(node);
    },

    addEdge(edge: FlowEdge) {
      this.edges.push(edge);
    },

    updateNodeData(id: string, partialData: Partial<FlowNodeData>) {
      const node = findNodeById(this.nodes, id);
      if (!node) return;
      node.data = { ...node.data, ...partialData };
    },

    removeNode(id: string) {
      this.nodes = this.nodes.filter((n) => n.id !== id);
      this.edges = this.edges.filter((e) => e.source !== id && e.target !== id);
    },

    /**
     * Records a node move for undo/redo and applies the new position.
     */
    moveNode(
      id: string,
      from: Position,
      to: Position,
      { recordHistory = true } = {}
    ) {
      const node = findNodeById(this.nodes, id);
      if (!node) return;
      node.position = to;
      if (recordHistory) {
        this.pushHistory({ kind: "move", nodeId: id, from, to });
      }
    },

    /**
     * Records a completed edit (from the drawer's Update button) for
     * undo/redo. Unlike moveNode, this doesn't apply the change itself —
     * the caller (FlowView, via the update mutation) already did that;
     * this just remembers the before/after snapshots so undo/redo can
     * revert or reapply them later.
     */
    recordEdit(id: string, from: FlowNodeData, to: FlowNodeData) {
      this.pushHistory({
        kind: "edit",
        nodeId: id,
        from: { ...from },
        to: { ...to },
      });
    },

    pushHistory(entry: HistoryEntry) {
      this.undoStack.push(entry);
      if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
      this.redoStack = [];
    },

    undo(): HistoryEntry | null {
      const entry = this.undoStack.pop();
      if (!entry) return null;
      const node = findNodeById(this.nodes, entry.nodeId);
      if (node) {
        if (entry.kind === "move") node.position = entry.from;
        else node.data = { ...entry.from };
      }
      this.redoStack.push(entry);
      return entry;
    },

    redo(): HistoryEntry | null {
      const entry = this.redoStack.pop();
      if (!entry) return null;
      const node = findNodeById(this.nodes, entry.nodeId);
      if (node) {
        if (entry.kind === "move") node.position = entry.to;
        else node.data = { ...entry.to };
      }
      this.undoStack.push(entry);
      return entry;
    },
  },
});
