<template>
  <v-card class="flow-node" :class="[`flow-node--${data.accent}`]" variant="outlined" tabindex="0" role="button"
    :aria-label="displayOnly ? `${title} node. Press Enter to preview.` : `${title} node. Press Enter to view details.`"
    @click.stop="handleActivate" @keydown.enter="handleActivate" @keydown.space.prevent="handleActivate">
    <Handle type="target" :position="Position.Top" />

    <v-card-text class="flow-node__body">
      <div class="flow-node__header">
        <v-avatar :class="`flow-node__icon-badge--${data.accent}`" size="24" rounded="lg">
          <v-icon :icon="mdiIcon" size="14" />
        </v-avatar>
        <span class="flow-node__title">{{ title }}</span>
      </div>
      <p v-if="kicker" class="flow-node__kicker">{{ kicker }}</p>
      <p class="flow-node__description">{{ truncatedDescription }}</p>
    </v-card-text>

    <Handle type="source" :position="Position.Bottom" />

    <v-btn class="flow-node__add-child" icon="mdi-plus" size="x-small" variant="flat"
      :aria-label="`Add a child node under ${title}`" @click.stop="handleAddChild" @keydown.stop />
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import { getMdiIcon, isDisplayOnlyNode, truncate } from '../utils/nodeUtils'
import type { FlowNodeData } from '../types'

const props = defineProps<Pick<NodeProps<FlowNodeData>, 'id' | 'type' | 'data'>>()

const emit = defineEmits<{
  'add-child': [parentId: string]
}>()

const router = useRouter()

// props.type is always 'custom' (vue-flow's render key). The real
// semantic type (sendMessage/addComment/...) travels in data.realType.
const realType = computed(() => props.data?.realType || (props.type as FlowNodeData['realType']))
const mdiIcon = computed(() => getMdiIcon(realType.value || ''))
const title = computed(() => props.data?.title || 'Untitled')
const truncatedDescription = computed(() => truncate(props.data?.description || '', 64))
const displayOnly = computed(() => isDisplayOnlyNode(realType.value || ''))
const kicker = computed(() => (realType.value === 'sendMessage' ? 'Message:' : ''))

function handleActivate() {
  // Every node opens the drawer now — display-only types (trigger) just
  // render it in read-only preview mode instead of the editable form. 
  router.push({ name: 'node-details', params: { id: props.id } })
}

function handleAddChild() {
  emit('add-child', props.id)
}
</script>

<style scoped>
.flow-node {
  position: relative;
  min-width: 200px;
  max-width: 230px;
  cursor: pointer;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.flow-node:hover {
  box-shadow: 0 4px 14px rgba(16, 24, 40, 0.12);
  transform: translateY(-1px);
}

.flow-node:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.flow-node__body {
  padding: 10px 12px !important;
}

.flow-node__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.flow-node__icon-badge--pink {
  background: #fdf2fa;
}

.flow-node__icon-badge--orange {
  background: #fff6ed;
}

.flow-node__icon-badge--slate {
  background: #f2f4f7;
}

.flow-node__title {
  font-weight: 600;
  font-size: 13.5px;
  color: #1c2129;
}

.flow-node__kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: #98a2b3;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.flow-node__description {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #667085;
  font-style: italic;
}

.flow-node--pink {
  border-color: #f9a8d4 !important;
}

.flow-node--orange {
  border-color: #fdba74 !important;
}

.flow-node__add-child {
  position: absolute !important;
  bottom: -13px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  opacity: 0.65;
  transition: opacity 0.12s ease;
}

.flow-node:hover .flow-node__add-child,
.flow-node:focus-within .flow-node__add-child,
.flow-node__add-child:focus-visible {
  opacity: 1;
}
</style>
