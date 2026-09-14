import type {
  CreatableNodeType,
  FlowNode,
  FlowNodeData,
  FlowNodeType,
  Position,
} from "../types";
import { CREATABLE_NODE_TYPES } from "../types";
export const NODE_TYPES = {
  SEND_MESSAGE: "sendMessage",
  ADD_COMMENT: "addComment",
  BUSINESS_HOURS: "businessHours",
  TRIGGER: "trigger",
} as const satisfies Record<string, FlowNodeType>;

// The `trigger` node (conversation start) isn't one of the three
// creatable/editable types the brief describes, so — like success/failure
// — it's treated as display-only
export const DISPLAY_ONLY_NODE_TYPES: FlowNodeType[] = [NODE_TYPES.TRIGGER];

export const NODE_TYPE_OPTIONS: { value: CreatableNodeType; label: string }[] =
  [
    { value: "sendMessage", label: "Send Message" },
    { value: "addComment", label: "Add Comments" },
    { value: "businessHours", label: "Business Hours" },
  ];

const ICONS: Record<FlowNodeType, string> = {
  sendMessage: "💬",
  addComment: "📝",
  businessHours: "🕒",
  trigger: "⚡",
};

export function getNodeIcon(type: FlowNodeType | string): string {
  return ICONS[type as FlowNodeType] || "❓";
}

const MDI_ICONS: Record<FlowNodeType, string> = {
  sendMessage: "mdi-message-text-outline",
  addComment: "mdi-comment-text-outline",
  businessHours: "mdi-clock-outline",
  trigger: "mdi-lightning-bolt-outline",
};

export function getMdiIcon(type: FlowNodeType | string): string {
  return MDI_ICONS[type as FlowNodeType] || "mdi-help-circle-outline";
}

export function isDisplayOnlyNode(type: FlowNodeType | string): boolean {
  return DISPLAY_ONLY_NODE_TYPES.includes(type as FlowNodeType);
}

export function isEditableNode(type: FlowNodeType | string): boolean {
  return (CREATABLE_NODE_TYPES as readonly string[]).includes(type);
}

/**
 * Truncates text to `max` characters and appends an ellipsis if needed.
 * Never breaks in the middle of a word if a space is nearby.
 */
export function truncate(text: string | null | undefined, max = 60): string {
  if (!text) return "";
  if (text.length <= max) return text;
  const sliced = text.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  const safe = lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${safe.trimEnd()}…`;
}

/** Builds the default `data` payload for a brand-new node of a given type. */
export function createDefaultNodeData(
  type: CreatableNodeType,
  { title, description }: { title: string; description: string }
): FlowNodeData {
  const base = { title, description };
  switch (type) {
    case "sendMessage":
      return { ...base, texts: [], attachments: [] };
    case "addComment":
      return { ...base, comments: [] };
    case "businessHours":
      return { ...base, hours: [] };
    default:
      return base;
  }
}

export function findNodeById(nodes: FlowNode[], id: string): FlowNode | null {
  return nodes.find((n) => n.id === id) || null;
}

/**
 * Generates a reasonable default position for a newly created node so it
 * doesn't stack directly on top of existing nodes.
 */
export function nextNodePosition(existingNodes: FlowNode[]): Position {
  const count = existingNodes.length;
  const col = count % 4;
  const row = Math.floor(count / 4);
  return { x: col * 260, y: row * 200 + 600 };
}

// Matches the spacing payloadTransform.ts uses when laying out the
// original payload, so nodes added via the "+" button sit visually
// consistent with the rest of the tree.
const CHILD_COLUMN_WIDTH = 260;
const CHILD_ROW_HEIGHT = 190;

export function nextChildPosition(
  parent: FlowNode,
  siblingIndex: number
): Position {
  return {
    x: parent.position.x + siblingIndex * CHILD_COLUMN_WIDTH,
    y: parent.position.y + CHILD_ROW_HEIGHT,
  };
}
