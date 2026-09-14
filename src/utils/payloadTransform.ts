import type {
  AttachmentItem,
  BusinessHourSlot,
  Flow,
  FlowEdge,
  FlowNode,
  FlowNodeData,
  FlowNodeType,
  RawFlowNode,
} from "../types";

/**
 * The real payload (src/data/payload.json) is a flat array of nodes linked
 * by `parentId`, with no x/y positions and per-type data shapes that don't
 * match our canvas/panels directly. This module is the one place that
 * normalizes raw payload nodes into the { nodes, edges } shape the rest of
 * the app is built around.
 */

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const COLUMN_WIDTH = 260; // horizontal spacing between siblings
const ROW_HEIGHT = 190; // vertical spacing between depth levels

function attachmentNameFromUrl(url: string, index: number): string {
  try {
    const clean = url.split("?")[0];
    const parts = clean.split("/");
    return parts[parts.length - 1] || `attachment-${index + 1}`;
  } catch {
    return `attachment-${index + 1}`;
  }
}

interface RawTimeSlot {
  day: string;
  startTime: string;
  endTime: string;
}

interface RawSendMessageItem {
  type: "text" | "attachment";
  text?: string;
  attachment?: string;
}

/** True for the raw payload's Success/Failure connector nodes. */
function isConnectorNode(raw: RawFlowNode): boolean {
  return raw.type === "dateTimeConnector";
}

/** Maps a raw payload node's `type` to our internal node type. Connector nodes never reach this — they're elided before rendering. */
function normalizeNodeType(raw: RawFlowNode): FlowNodeType {
  if (raw.type === "dateTime") return "businessHours";
  // trigger, sendMessage, addComment already match our internal type names.
  return raw.type as FlowNodeType;
}

/** Builds the `data` object our components expect for a given internal type. */
function normalizeNodeData(type: FlowNodeType, raw: RawFlowNode): FlowNodeData {
  const name = raw.name;
  const data = raw.data || {};

  switch (type) {
    case "sendMessage": {
      const items = (data.payload as RawSendMessageItem[]) || [];
      const texts = items
        .filter((item) => item.type === "text")
        .map((item) => item.text || "");
      const attachments: AttachmentItem[] = items
        .filter((item) => item.type === "attachment")
        .map((item, i) => ({
          id: `att-${raw.id}-${i}`,
          name: attachmentNameFromUrl(item.attachment || "", i),
          url: item.attachment || "",
        }));
      return {
        title: name || "Send Message",
        description: texts[0] || "Sends a message to the user.",
        texts,
        attachments,
      };
    }

    case "addComment": {
      const comment = (data.comment as string) || "";
      return {
        title: name || "Add Comment",
        description: comment || "Internal note for agents.",
        comments: comment ? [comment] : [],
      };
    }

    case "businessHours": {
      const times = (data.times as RawTimeSlot[]) || [];
      const hours: BusinessHourSlot[] = times.map((slot) => ({
        day: DAY_LABELS[slot.day] || slot.day,
        open: slot.startTime,
        close: slot.endTime,
      }));
      const timezone = (data.timezone as string) || "UTC";
      return {
        title: name || "Business Hours",
        description: `Business Hours - ${timezone}`,
        hours,
        timezone,
      };
    }

    case "trigger": {
      const oncePerContact = !!data.oncePerContact;
      return {
        title: name || "Conversation Opened",
        description: oncePerContact
          ? "Conversation Opened (once per contact)"
          : "Conversation Opened",
        displayOnly: true,
      };
    }

    default:
      return { title: name || "Untitled", description: "" };
  }
}

/**
 * Converts the flat, parentId-linked payload array into Vue Flow's
 * { nodes, edges } shape:
 *  - Success/Failure connector nodes are elided into edge labels.
 *  - Position is a computed top-to-bottom layered layout (depth = row,
 *    sibling order = column) since the source payload carries no
 *    coordinates.
 */
export function transformPayloadToFlow(rawNodes: RawFlowNode[]): Flow {
  const byId = new Map(rawNodes.map((raw) => [String(raw.id), raw]));

  function resolveEffectiveParent(raw: RawFlowNode): {
    parentId: string | null;
    label?: string;
    labelVariant?: "success" | "failure";
  } {
    let parentKey = String(raw.parentId);
    let label: string | undefined;
    let labelVariant: "success" | "failure" | undefined;

    while (parentKey !== "-1") {
      const parentRaw = byId.get(parentKey);
      if (!parentRaw) return { parentId: null };
      if (isConnectorNode(parentRaw)) {
        labelVariant =
          (parentRaw.data?.connectorType as "success" | "failure") || "success";
        label =
          parentRaw.name ||
          (labelVariant === "success" ? "Success" : "Failure");
        parentKey = String(parentRaw.parentId);
        continue;
      }
      return { parentId: parentKey, label, labelVariant };
    }
    return { parentId: null, label, labelVariant };
  }

  // Group renderable (non-connector) nodes by their effective parent.
  const childrenByParent = new Map<
    string,
    { id: string; label?: string; labelVariant?: "success" | "failure" }[]
  >();
  const renderable = rawNodes.filter((raw) => !isConnectorNode(raw));

  renderable.forEach((raw) => {
    const id = String(raw.id);
    const { parentId, label, labelVariant } = resolveEffectiveParent(raw);
    if (parentId === null) return;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId)!.push({ id, label, labelVariant });
  });

  const roots = renderable
    .filter((raw) => String(raw.parentId) === "-1")
    .map((raw) => String(raw.id));
  const columnCounts = new Map<number, number>();
  const visited = new Set<string>();
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const queue: { id: string; depth: number }[] = roots.map((id) => ({
    id,
    depth: 0,
  }));

  while (queue.length) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const raw = byId.get(id);
    if (!raw) continue;

    const type = normalizeNodeType(raw);
    const data = normalizeNodeData(type, raw);
    const col = columnCounts.get(depth) || 0;
    columnCounts.set(depth, col + 1);

    nodes.push({
      id,
      type,
      position: { x: col * COLUMN_WIDTH, y: depth * ROW_HEIGHT },
      data,
    });

    const children = childrenByParent.get(id) || [];
    children.forEach((child) => {
      edges.push({
        id: `e-${id}-${child.id}`,
        source: id,
        target: child.id,
        label: child.label,
        labelVariant: child.labelVariant,
      });
      queue.push({ id: child.id, depth: depth + 1 });
    });
  }

  return { nodes, edges };
}

// Exported for unit testing individual mapping steps.
export const __testables = {
  normalizeNodeType,
  normalizeNodeData,
  isConnectorNode,
};
