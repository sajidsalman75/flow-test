import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { loadRawPayload, fetchFlow, createNodeRequest } from "../api/nodesApi";
import fallbackPayload from "../data/payload.json";

const REMOTE_NODE = [
  {
    id: "remote-1",
    parentId: -1,
    type: "trigger",
    data: { type: "conversationOpened" },
  },
];

describe("nodesApi", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("loadRawPayload", () => {
    it("returns the remote payload when the S3 fetch succeeds", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => REMOTE_NODE })
      );
      const result = await loadRawPayload();
      expect(result).toEqual(REMOTE_NODE);
    });

    it("falls back to the bundled payload when the fetch rejects", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("network down"))
      );
      const result = await loadRawPayload();
      expect(result).toEqual(fallbackPayload);
    });

    it("falls back to the bundled payload on a non-ok HTTP response", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue({ ok: false, status: 403, json: async () => ({}) })
      );
      const result = await loadRawPayload();
      expect(result).toEqual(fallbackPayload);
    });
  });

  describe("fetchFlow", () => {
    it("seeds from the remote payload on first call and caches it in localStorage", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => REMOTE_NODE })
      );
      const flow = await fetchFlow();
      expect(flow.nodes).toHaveLength(1);
      expect(flow.nodes[0].id).toBe("remote-1");
      expect(localStorage.getItem("flow-chart-app:flow")).not.toBeNull();
    });

    it("does not re-fetch once the flow is already cached", async () => {
      const fetchSpy = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => REMOTE_NODE });
      vi.stubGlobal("fetch", fetchSpy);

      await fetchFlow();
      await fetchFlow();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("createNodeRequest", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => REMOTE_NODE })
      );
    });

    it("creates a node with no edge when no parentId is given", async () => {
      const { node, edge } = await createNodeRequest({
        type: "addComment",
        position: { x: 0, y: 0 },
        data: { title: "Note", description: "A note", comments: [] },
      });
      expect(node.data.title).toBe("Note");
      expect(edge).toBeUndefined();
    });

    it("creates a connecting edge and persists it when parentId is given", async () => {
      const { node, edge } = await createNodeRequest({
        type: "addComment",
        position: { x: 0, y: 0 },
        data: { title: "Note", description: "A note", comments: [] },
        parentId: "remote-1",
      });
      expect(edge).toEqual({
        id: `e-remote-1-${node.id}`,
        source: "remote-1",
        target: node.id,
      });

      const flow = await fetchFlow();
      expect(flow.edges.find((e) => e.id === edge!.id)).toBeTruthy();
    });
  });
});
