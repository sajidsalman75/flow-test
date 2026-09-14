<template>
  <v-app-bar :elevation="1" color="surface">
    <v-icon icon="mdi-source-branch" class="ml-3 mr-2" />
    <v-app-bar-title class="flex-0-1-auto">Flow Builder</v-app-bar-title>
    <v-spacer />
    <v-btn variant="text" prepend-icon="mdi-undo" :disabled="!flowStore.canUndo" @click="handleUndo">Undo</v-btn>
    <v-btn variant="text" prepend-icon="mdi-redo" :disabled="!flowStore.canRedo" @click="handleRedo">Redo</v-btn>
    <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" class="mr-3" @click="openCreateModal()">
      Create New Node
    </v-btn>
  </v-app-bar>

  <v-main>
    <div class="flow-view__canvas">
      <div v-if="isLoading" class="flow-view__status">
        <v-progress-circular indeterminate color="primary" class="mr-2" />
        Loading flow…
      </div>
      <v-alert v-else-if="isError" type="error" variant="tonal" class="ma-4">
        Couldn't load the flow.
        <template #append>
          <v-btn variant="text" size="small" @click="() => refetch()">Retry</v-btn>
        </template>
      </v-alert>
      <FlowCanvas v-else @add-child="handleAddChildRequest" />
    </div>

    <CreateNodeModal :open="isCreateOpen" :is-pending="createMutation.isPending.value"
      :parent-title="pendingParentTitle" @close="closeCreateModal" @create="handleCreate" />

    <NodeDetailsDrawer :node-id="(route.params.id as string) || null" @update-node="handleUpdateNode"
      @delete-node="handleDeleteNode" />
  </v-main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import FlowCanvas from '../components/FlowCanvas.vue'
import CreateNodeModal from '../components/CreateNodeModal.vue'
import NodeDetailsDrawer from '../components/NodeDetailsDrawer.vue'
import { useFlowStore } from '../stores/flowStore'
import { fetchFlow, createNodeRequest, updateNodeRequest, deleteNodeRequest } from '../api/nodesApi'
import { createDefaultNodeData, nextChildPosition, nextNodePosition } from '../utils/nodeUtils'
import type { CreatableNodeType, FlowNodeData } from '../types'

const route = useRoute()
const router = useRouter()
const flowStore = useFlowStore()
const queryClient = useQueryClient()

const isCreateOpen = ref(false)
// Set when the modal was opened via a node's "+" button, so the new node
// gets wired up as that node's child instead of dropped unconnected.
const pendingParentId = ref<string | null>(null)
const pendingParentTitle = computed(() =>
  pendingParentId.value ? flowStore.getNode(pendingParentId.value)?.data.title ?? null : null
)

// --- Query: fetch the flow once, sync it into the Pinia store ---
const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['flow'],
  queryFn: fetchFlow,
})

watch(
  data,
  (flow) => {
    if (flow && !flowStore.initialized) {
      flowStore.setFlow(JSON.parse(JSON.stringify(flow)))
    }
  },
  { immediate: true }
)

// --- Mutations ---
const createMutation = useMutation({
  mutationFn: createNodeRequest,
  onSuccess: ({ node, edge }) => {
    flowStore.addNode(node)
    if (edge) flowStore.addEdge(edge)
    queryClient.invalidateQueries({ queryKey: ['flow'] })
  },
})

const updateMutation = useMutation({
  mutationFn: updateNodeRequest,
  onSuccess: (node) => {
    flowStore.updateNodeData(node.id, node.data)
  },
})

const deleteMutation = useMutation({
  mutationFn: deleteNodeRequest,
  onSuccess: (id) => {
    flowStore.removeNode(id)
  },
})

function openCreateModal() {
  pendingParentId.value = null
  isCreateOpen.value = true
}

function handleAddChildRequest(parentId: string) {
  pendingParentId.value = parentId
  isCreateOpen.value = true
}

function closeCreateModal() {
  isCreateOpen.value = false
  pendingParentId.value = null
}

function handleCreate({
  title,
  description,
  type,
}: {
  title: string
  description: string
  type: CreatableNodeType
}) {
  const parentId = pendingParentId.value
  const parentNode = parentId ? flowStore.getNode(parentId) : null
  const siblingCount = parentId ? flowStore.edges.filter((e) => e.source === parentId).length : 0
  const position = parentNode ? nextChildPosition(parentNode, siblingCount) : nextNodePosition(flowStore.nodes)
  const data = createDefaultNodeData(type, { title, description })
  createMutation.mutate(
    { type, position, data, parentId: parentNode?.id },
    { onSuccess: closeCreateModal }
  )
}

async function handleUpdateNode({ id, data }: { id: string; data: Partial<FlowNodeData> }) {
  const before = flowStore.getNode(id)?.data
  await updateMutation.mutateAsync({ id, data })
  const after = flowStore.getNode(id)?.data
  // Snapshot both full data objects (not just the partial that was sent)
  // so undo/redo can restore the exact prior state, whichever fields
  // changed.
  if (before && after) flowStore.recordEdit(id, before, after)
}

function handleDeleteNode(id: string) {
  deleteMutation.mutate(id, {
    onSuccess: () => router.push({ name: 'canvas' }),
  })
}

function handleUndo() {
  const entry = flowStore.undo()
  if (!entry) return
  if (entry.kind === 'move') updateMutation.mutate({ id: entry.nodeId, position: entry.from })
  else updateMutation.mutate({ id: entry.nodeId, data: entry.from })
}

function handleRedo() {
  const entry = flowStore.redo()
  if (!entry) return
  if (entry.kind === 'move') updateMutation.mutate({ id: entry.nodeId, position: entry.to })
  else updateMutation.mutate({ id: entry.nodeId, data: entry.to })
}
</script>

<style scoped>
.flow-view__canvas {
  height: calc(100vh - 64px);
  position: relative;
}

.flow-view__status {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(0, 0, 0, 0.6);
  font-size: 14px;
}
</style>
