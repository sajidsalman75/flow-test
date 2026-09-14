export type FlowNodeType =
  | "sendMessage"
  | "addComment"
  | "businessHours"
  | "trigger";

export const CREATABLE_NODE_TYPES = [
  "sendMessage",
  "addComment",
  "businessHours",
] as const;
export type CreatableNodeType = (typeof CREATABLE_NODE_TYPES)[number];

export interface AttachmentItem {
  id: string;
  name: string;
  url: string;
}

export interface BusinessHourSlot {
  day: string;
  open: string;
  close: string;
}

export interface FlowNodeData {
  title: string;
  description: string;
  displayOnly?: boolean;
  texts?: string[];
  attachments?: AttachmentItem[];
  comments?: string[];
  hours?: BusinessHourSlot[];
  timezone?: string;
  realType?: FlowNodeType;
  accent?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: Position;
  data: FlowNodeData;
}

export type EdgeLabelVariant = "success" | "failure";

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  labelVariant?: EdgeLabelVariant;
}

export interface Flow {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface RawFlowNode {
  id: string | number;
  parentId: string | number;
  type: string;
  name?: string;
  data?: Record<string, unknown>;
}

export interface CreateNodeFormValues {
  title: string;
  description: string;
  type: CreatableNodeType | "";
}

export interface FormErrors {
  title?: string;
  description?: string;
  type?: string;
}
