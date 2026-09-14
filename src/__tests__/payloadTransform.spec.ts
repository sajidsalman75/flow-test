import { describe, it, expect } from "vitest";
import { transformPayloadToFlow, __testables } from "../utils/payloadTransform";
import type { RawFlowNode } from "../types";

const { normalizeNodeType, normalizeNodeData, isConnectorNode } = __testables;

const SAMPLE: RawFlowNode[] = [
  {
    id: 1,
    parentId: -1,
    type: "trigger",
    data: { type: "conversationOpened", oncePerContact: false },
  },
  {
    name: "Business Hours",
    id: "d09c08",
    type: "dateTime",
    data: {
      times: [{ startTime: "09:00", endTime: "17:00", day: "mon" }],
      connectors: ["161f52", "28c4b9"],
      timezone: "UTC",
    },
    parentId: 1,
  },
  {
    name: "Success",
    id: "161f52",
    type: "dateTimeConnector",
    data: { connectorType: "success" },
    parentId: "d09c08",
  },
  {
    name: "Failure",
    id: "28c4b9",
    type: "dateTimeConnector",
    data: { connectorType: "failure" },
    parentId: "d09c08",
  },
  {
    name: "Welcome Message",
    id: "b0653a",
    type: "sendMessage",
    data: {
      payload: [
        { type: "text", text: "Hello there" },
        { type: "attachment", attachment: "https://example.com/photo.jpg?x=1" },
      ],
    },
    parentId: "161f52",
  },
  {
    name: "Away Message",
    id: "b6a0c1",
    type: "sendMessage",
    data: { payload: [{ type: "text", text: "Sorry, we are away." }] },
    parentId: "28c4b9",
  },
  {
    id: "e879e4",
    type: "addComment",
    parentId: "b0653a",
    name: "Add Comment #1",
    data: { comment: "User message during off hours" },
  },
];

describe("isConnectorNode", () => {
  it("flags dateTimeConnector nodes", () => {
    expect(
      isConnectorNode({ id: "1", parentId: "0", type: "dateTimeConnector" })
    ).toBe(true);
    expect(
      isConnectorNode({ id: "1", parentId: "0", type: "sendMessage" })
    ).toBe(false);
  });
});

describe("normalizeNodeType", () => {
  it("maps dateTime to businessHours", () => {
    expect(
      normalizeNodeType({ id: "1", parentId: "0", type: "dateTime" })
    ).toBe("businessHours");
  });

  it("passes through sendMessage/addComment/trigger unchanged", () => {
    expect(
      normalizeNodeType({ id: "1", parentId: "0", type: "sendMessage" })
    ).toBe("sendMessage");
    expect(
      normalizeNodeType({ id: "1", parentId: "0", type: "addComment" })
    ).toBe("addComment");
    expect(normalizeNodeType({ id: "1", parentId: "0", type: "trigger" })).toBe(
      "trigger"
    );
  });
});

describe("normalizeNodeData", () => {
  it("extracts texts and attachments for sendMessage", () => {
    const raw: RawFlowNode = {
      id: "n1",
      parentId: "0",
      type: "sendMessage",
      name: "Welcome",
      data: {
        payload: [
          { type: "text", text: "Hi" },
          { type: "attachment", attachment: "https://x.com/img.png" },
        ],
      },
    };
    const data = normalizeNodeData("sendMessage", raw);
    expect(data.texts).toEqual(["Hi"]);
    expect(data.attachments).toHaveLength(1);
    expect(data.attachments![0].url).toBe("https://x.com/img.png");
    expect(data.attachments![0].name).toBe("img.png");
  });

  it("wraps a single comment string into a comments array", () => {
    const data = normalizeNodeData("addComment", {
      id: "n1",
      parentId: "0",
      type: "addComment",
      name: "Note",
      data: { comment: "hello" },
    });
    expect(data.comments).toEqual(["hello"]);
  });

  it("maps day/startTime/endTime into day/open/close with full day names", () => {
    const data = normalizeNodeData("businessHours", {
      id: "n1",
      parentId: "0",
      type: "dateTime",
      name: "Hours",
      data: {
        times: [{ day: "mon", startTime: "09:00", endTime: "17:00" }],
        timezone: "UTC",
      },
    });
    expect(data.hours).toEqual([
      { day: "Monday", open: "09:00", close: "17:00" },
    ]);
    expect(data.description).toBe("Business Hours - UTC");
  });

  it("marks trigger as displayOnly", () => {
    expect(
      normalizeNodeData("trigger", {
        id: "n1",
        parentId: "-1",
        type: "trigger",
        data: {},
      }).displayOnly
    ).toBe(true);
  });
});

describe("transformPayloadToFlow", () => {
  it("elides dateTimeConnector nodes — they never appear as canvas nodes", () => {
    const { nodes } = transformPayloadToFlow(SAMPLE);
    expect(nodes.find((n) => n.id === "161f52")).toBeUndefined();
    expect(nodes.find((n) => n.id === "28c4b9")).toBeUndefined();
    expect(nodes).toHaveLength(SAMPLE.length - 2);
  });

  it("re-parents a connector´s children directly to the connector´s parent, with a label carrying the connector info", () => {
    const { edges } = transformPayloadToFlow(SAMPLE);
    const successEdge = edges.find((e) => e.target === "b0653a");
    expect(successEdge?.source).toBe("d09c08");
    expect(successEdge?.label).toBe("Success");
    expect(successEdge?.labelVariant).toBe("success");

    const failureEdge = edges.find((e) => e.target === "b6a0c1");
    expect(failureEdge?.source).toBe("d09c08");
    expect(failureEdge?.labelVariant).toBe("failure");
  });

  it("leaves ordinary parent-child edges unlabeled", () => {
    const { edges } = transformPayloadToFlow(SAMPLE);
    const rootEdge = edges.find(
      (e) => e.source === "1" && e.target === "d09c08"
    );
    expect(rootEdge?.label).toBeUndefined();
  });

  it("lays out nodes top-to-bottom: depth increases y, not x", () => {
    const { nodes } = transformPayloadToFlow(SAMPLE);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    expect(byId["1"].position.y).toBeLessThan(byId["d09c08"].position.y);
    expect(byId["d09c08"].position.y).toBeLessThan(byId["b0653a"].position.y);
  });

  it("normalizes node ids to strings", () => {
    const { nodes } = transformPayloadToFlow(SAMPLE);
    const trigger = nodes.find((n) => n.type === "trigger");
    expect(trigger?.id).toBe("1");
    expect(typeof trigger?.id).toBe("string");
  });
});
