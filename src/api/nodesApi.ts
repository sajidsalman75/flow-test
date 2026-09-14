import { v4 as uuidv4 } from "uuid";
import fallbackPayload from "../data/payload.json";
import { transformPayloadToFlow } from "../utils/payloadTransform";
import type {
  CreatableNodeType,
  Flow,
  FlowEdge,
  FlowNode,
  FlowNodeData,
  Position,
  RawFlowNode,
} from "../types";

const PAYLOAD_URL =
  "https://respond-io-fe-bucket.s3.ap-southeast-1.amazonaws.com/candidate-assessments/payload.json";
const STORAGE_KEY = "flow-chart-app:flow";
const SIMULATED_LATENCY = 250;

function delay(ms = SIMULATED_LATENCY): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readStorage(): Flow | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Flow) : null;
  } catch {
    return null;
  }
}

function writeStorage(flow: Flow): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
}

/** Fetches the real payload from S3; falls back to the bundled copy on any network/CORS failure. */
export async function loadRawPayload(): Promise<RawFlowNode[]> {
  try {
    const response = await fetch(PAYLOAD_URL);
    if (!response.ok)
      throw new Error(`Payload request failed with status ${response.status}`);
    return (await response.json()) as RawFlowNode[];
  } catch (error) {
    console.warn(
      "Could not fetch the payload from S3 — falling back to the bundled copy.",
      error
    );
    return fallbackPayload as RawFlowNode[];
  }
}

async function ensureSeeded(): Promise<Flow> {
  const existing = readStorage();
  if (existing) return existing;
  const raw = await loadRawPayload();
  const seeded = transformPayloadToFlow(raw);
  writeStorage(seeded);
  return seeded;
}

/** GET the whole flow, fetched from the real payload URL on first load. */
export async function fetchFlow(): Promise<Flow> {
  await delay();
  const flow = await ensureSeeded();
  // Return a deep copy so callers never accidentally mutate the server state.
  return JSON.parse(JSON.stringify(flow)) as Flow;
}

export interface CreateNodeInput {
  type: CreatableNodeType;
  position: Position;
  data: FlowNodeData;
  /** When set (from a node's "+" button), an edge from this node to the new one is created alongside it. */
  parentId?: string;
}

export interface CreateNodeResult {
  node: FlowNode;
  edge?: FlowEdge;
}

/** POST a new node */
export async function createNodeRequest({
  type,
  position,
  data,
  parentId,
}: CreateNodeInput): Promise<CreateNodeResult> {
  await delay();
  const flow = await ensureSeeded();
  const node: FlowNode = { id: uuidv4(), type, position, data };
  flow.nodes.push(node);

  let edge: FlowEdge | undefined;
  if (parentId) {
    edge = {
      id: `e-${parentId}-${node.id}`,
      source: parentId,
      target: node.id,
    };
    flow.edges.push(edge);
  }

  writeStorage(flow);
  return { node, edge };
}

export interface UpdateNodeInput {
  id: string;
  data?: Partial<FlowNodeData>;
  position?: Position;
}

/** PATCH an existing node's data and position. */
export async function updateNodeRequest({
  id,
  data,
  position,
}: UpdateNodeInput): Promise<FlowNode> {
  await delay();
  const flow = await ensureSeeded();
  const node = flow.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`Node ${id} not found`);
  if (data) node.data = { ...node.data, ...data };
  if (position) node.position = position;
  writeStorage(flow);
  return node;
}

/** DELETE a node */
export async function deleteNodeRequest(id: string): Promise<string> {
  await delay();
  const flow = await ensureSeeded();
  flow.nodes = flow.nodes.filter((n) => n.id !== id);
  flow.edges = flow.edges.filter((e) => e.source !== id && e.target !== id);
  writeStorage(flow);
  return id;
}
