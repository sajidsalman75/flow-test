<template>
  <div class="flow-canvas">
    <VueFlow v-model:nodes="displayNodes" v-model:edges="displayEdges" :default-viewport="{ zoom: 0.9 }" :min-zoom="0.2"
      :max-zoom="2" fit-view-on-init @node-drag-stop="onNodeDragStop">
      <template #node-custom="nodeProps">
        <CustomNode v-bind="nodeProps" @add-child="emit('add-child', $event)" />
      </template>

      <Background pattern-color="#d7dbe3" :gap="18" />
      <Controls />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VueFlow, type Edge, type Node, type NodeDragEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import CustomNode from './CustomNode.vue'
import { useFlowStore } from '../stores/flowStore'
import type { FlowNodeData, FlowNodeType } from '../types'

const store = useFlowStore()

const emit = defineEmits<{
  'add-child': [parentId: string]
}>()

const ACCENT_BY_TYPE: Record<FlowNodeType, string> = {
  trigger: 'pink',
  businessHours: 'orange',
  sendMessage: 'slate',
  addComment: 'slate',
}

const LABEL_STYLE_BY_VARIANT = {
  success: { fill: '#1849a9', fontWeight: 600 },
  failure: { fill: '#b93815', fontWeight: 600 },
} as const

const LABEL_BG_STYLE_BY_VARIANT = {
  success: { fill: '#eff8ff' },
  failure: { fill: '#fff6ed' },
} as const

const displayNodes = computed<Node<FlowNodeData>[]>({
  get() {
    return store.nodes.map((n) => ({
      ...n,
      type: 'custom',
      data: { ...n.data, accent: ACCENT_BY_TYPE[n.type] || 'slate', realType: n.type },
    }))
  },
  set() {
    // No-op: node array shape changes (add/remove) go through the store
    // actions directly, not through v-model writes from vue-flow.
  },
})

// Success/Failure render as small pill labels on the edge itself (per the
// mockup), not as separate node cards — see payloadTransform.ts.
const displayEdges = computed<Edge[]>({
  get() {
    return store.edges.map((e) => ({
      ...e,
      animated: false,
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 8,
      labelStyle: e.labelVariant ? LABEL_STYLE_BY_VARIANT[e.labelVariant] : undefined,
      labelBgStyle: e.labelVariant ? LABEL_BG_STYLE_BY_VARIANT[e.labelVariant] : undefined,
    }))
  },
  set() { },
})

function onNodeDragStop({ node }: NodeDragEvent) {
  const original = store.getNode(node.id)
  if (!original) return
  const from = original.position
  const to = node.position
  if (from.x === to.x && from.y === to.y) return
  store.moveNode(node.id, from, to)
}
</script>

<style scoped>
.flow-canvas {
  width: 100%;
  height: 100%;
}
</style>
