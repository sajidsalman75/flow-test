import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useFlowStore } from "../stores/flowStore";
import type { Flow } from "../types";

function makeFlow(): Flow {
  return {
    nodes: [
      {
        id: "n1",
        type: "sendMessage",
        position: { x: 0, y: 0 },
        data: { title: "A", description: "a" },
      },
      {
        id: "n2",
        type: "addComment",
        position: { x: 100, y: 0 },
        data: { title: "B", description: "b" },
      },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  };
}

describe("useFlowStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("initializes with setFlow", () => {
    const store = useFlowStore();
    store.setFlow(makeFlow());
    expect(store.nodes).toHaveLength(2);
    expect(store.initialized).toBe(true);
  });

  it("adds a node", () => {
    const store = useFlowStore();
    store.setFlow(makeFlow());
    store.addNode({
      id: "n3",
      type: "businessHours",
      position: { x: 0, y: 0 },
      data: { title: "C", description: "c" },
    });
    expect(store.getNode("n3")).toBeTruthy();
  });

  it("updates node data", () => {
    const store = useFlowStore();
    store.setFlow(makeFlow());
    store.updateNodeData("n1", { title: "Updated" });
    expect(store.getNode("n1")?.data.title).toBe("Updated");
  });

  it("adds an edge", () => {
    const store = useFlowStore();
    store.setFlow(makeFlow());
    store.addEdge({ id: "e2", source: "n2", target: "n1" });
    expect(store.edges).toHaveLength(2);
    expect(store.edges.find((e) => e.id === "e2")).toBeTruthy();
  });

  it("removes a node and its edges", () => {
    const store = useFlowStore();
    store.setFlow(makeFlow());
    store.removeNode("n1");
    expect(store.getNode("n1")).toBeNull();
    expect(store.edges).toHaveLength(0);
  });

  it("supports undo/redo for node moves", () => {
    const store = useFlowStore();
    store.setFlow(makeFlow());
    const from = { x: 0, y: 0 };
    const to = { x: 200, y: 200 };

    store.moveNode("n1", from, to);
    expect(store.getNode("n1")?.position).toEqual(to);
    expect(store.canUndo).toBe(true);

    store.undo();
    expect(store.getNode("n1")?.position).toEqual(from);
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(store.getNode("n1")?.position).toEqual(to);
  });

  it("clears the redo stack on a new move", () => {
    const store = useFlowStore();
    store.setFlow(makeFlow());
    store.moveNode("n1", { x: 0, y: 0 }, { x: 10, y: 10 });
    store.undo();
    expect(store.canRedo).toBe(true);
    store.moveNode("n1", { x: 0, y: 0 }, { x: 20, y: 20 });
    expect(store.canRedo).toBe(false);
  });

  it("supports undo/redo for edits (not just moves)", () => {
    const store = useFlowStore();
    store.setFlow(makeFlow());
    const before = { title: "A", description: "a" };
    const after = { title: "A Updated", description: "a new description" };

    store.updateNodeData("n1", after);
    store.recordEdit("n1", before, after);
    expect(store.getNode("n1")?.data).toEqual(after);
    expect(store.canUndo).toBe(true);

    store.undo();
    expect(store.getNode("n1")?.data).toEqual(before);
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(store.getNode("n1")?.data).toEqual(after);
  });

  it("undoes moves and edits in the correct order when mixed on the same stack", () => {
    const store = useFlowStore();
    store.setFlow(makeFlow());

    store.moveNode("n1", { x: 0, y: 0 }, { x: 50, y: 50 });
    store.recordEdit(
      "n1",
      { title: "A", description: "a" },
      { title: "A2", description: "a2" }
    );

    store.undo();
    expect(store.getNode("n1")?.data.title).toBe("A");
    expect(store.getNode("n1")?.position).toEqual({ x: 50, y: 50 });

    store.undo();
    expect(store.getNode("n1")?.position).toEqual({ x: 0, y: 0 });
  });
});
