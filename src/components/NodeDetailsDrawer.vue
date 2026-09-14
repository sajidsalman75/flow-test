<template>
  <v-navigation-drawer :model-value="!!node" location="right" temporary width="480" disable-route-watcher
    @update:model-value="(v: boolean) => !v && close()">
    <template v-if="node">
      <v-toolbar density="comfortable" color="surface">
        <v-icon :icon="mdiIcon" class="ml-3" />
        <v-chip v-if="isPreview" size="small" class="ml-2">Preview</v-chip>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" aria-label="Close details" @click="close" />
      </v-toolbar>

      <!-- Display-only nodes (trigger) get a read-only preview: no
           inputs, no Update/Delete — just what the node is. -->
      <v-card-text v-if="isPreview" class="d-flex flex-column ga-4">
        <div>
          <div class="text-caption font-weight-medium text-medium-emphasis">Title</div>
          <p class="text-body-2 mt-1">{{ node.data.title }}</p>
        </div>
        <div>
          <div class="text-caption font-weight-medium text-medium-emphasis">Description</div>
          <p class="text-body-2 mt-1">{{ node.data.description }}</p>
        </div>
        <p class="text-caption text-medium-emphasis">This node is for display only and can't be edited.</p>
      </v-card-text>

      <template v-else>
        <v-card-text class="d-flex flex-column ga-4">
          <!-- Business Hours: title/description are fixed text, not
               editable — only the hours/timezone panel below is. -->
          <template v-if="isTitleReadOnly">
            <div>
              <div class="text-caption font-weight-medium text-medium-emphasis">Title</div>
              <p class="text-body-2 mt-1">{{ node.data.title }}</p>
            </div>
            <div>
              <div class="text-caption font-weight-medium text-medium-emphasis">Description</div>
              <p class="text-body-2 mt-1">{{ node.data.description }}</p>
            </div>
          </template>

          <!-- Send Message / Add Comment: just an editable title — no
               description field, the panel below (message/comment) is
               the content. -->
          <v-text-field v-else v-model="localTitle" name="title" label="Title"
            :error-messages="errors.title ? [errors.title] : []" @blur="validateFields" />

          <v-divider />

          <component :is="panelComponent" v-if="panelComponent" ref="panelRef" :data="node.data" />
        </v-card-text>

        <v-card-actions class="px-4 pb-4">
          <v-btn color="error" variant="tonal" @click="confirmDelete">Delete node</v-btn>
          <v-spacer />
          <span v-if="isSaving" class="text-caption text-medium-emphasis mr-2">Saving…</span>
          <span v-else-if="justSaved" class="text-caption text-primary font-weight-medium mr-2">Saved</span>
          <v-btn color="primary" variant="flat" :loading="isSaving" @click="handleUpdate">Update</v-btn>
        </v-card-actions>
      </template>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { useFlowStore } from '../stores/flowStore'
import { getMdiIcon, isDisplayOnlyNode } from '../utils/nodeUtils'
import SendMessagePanel from './panels/SendMessagePanel.vue'
import AddCommentPanel from './panels/AddCommentPanel.vue'
import BusinessHoursPanel from './panels/BusinessHoursPanel.vue'
import type { FlowNodeData } from '../types'

const props = defineProps<{
  nodeId: string | null
}>()

const emit = defineEmits<{
  'update-node': [payload: { id: string; data: Partial<FlowNodeData> }]
  'delete-node': [id: string]
}>()

const store = useFlowStore()
const router = useRouter()

const isSaving = ref(false)
const justSaved = ref(false)
const errors = ref<{ title?: string }>({})
const localTitle = ref('')
const localDescription = ref('')

const panelRef = ref<{ getData: () => Partial<FlowNodeData> | null } | null>(null)

const node = computed(() => (props.nodeId ? store.getNode(props.nodeId) : null))
const isPreview = computed(() => (node.value ? isDisplayOnlyNode(node.value.type) : false))
// Business Hours' title/description are shown but not editable — only its
// panel (the hours/timezone) is. sendMessage/addComment get an editable
// title and no description field at all (their panel is the content).
const isTitleReadOnly = computed(() => node.value?.type === 'businessHours')

watch(
  [node, () => store.initialized],
  ([n, initialized]) => {
    if (props.nodeId && initialized && !n) {
      router.replace({ name: 'canvas' })
      return
    }
    if (n) {
      localTitle.value = n.data.title
      localDescription.value = n.data.description
      errors.value = {}
      justSaved.value = false
    }
  },
  { immediate: true, deep: true }
)

const mdiIcon = computed(() => (node.value ? getMdiIcon(node.value.type) : ''))

const panelComponent = computed<Component | null>(() => {
  if (!node.value) return null
  switch (node.value.type) {
    case 'sendMessage':
      return SendMessagePanel
    case 'addComment':
      return AddCommentPanel
    case 'businessHours':
      return BusinessHoursPanel
    default:
      return null
  }
})

/** Validates the title field */
function validateFields(): boolean {
  errors.value = {}
  if (isTitleReadOnly.value) return true
  const trimmed = localTitle.value.trim()
  if (!trimmed) {
    errors.value.title = 'Title is required.'
  } else if (trimmed.length > 80) {
    errors.value.title = 'Title must be 80 characters or fewer.'
  }
  return !errors.value.title
}

/** The single "Update" action: validates, pulls staged panel edits, and saves everything together. */
async function handleUpdate() {
  if (!node.value) return
  if (!validateFields()) return

  const panelData = panelRef.value?.getData ? panelRef.value.getData() : {}
  if (panelData === null) return

  isSaving.value = true
  justSaved.value = false
  try {
    emit('update-node', {
      id: node.value.id,
      data: { title: localTitle.value.trim(), description: localDescription.value.trim(), ...panelData },
    })
    justSaved.value = true
  } finally {
    isSaving.value = false
  }
}

function confirmDelete() {
  if (!node.value) return
  const ok = window.confirm(`Delete "${node.value.data.title}"? This cannot be undone.`)
  if (!ok) return
  emit('delete-node', node.value.id)
}

function close() {
  router.push({ name: 'canvas' })
}
</script>
