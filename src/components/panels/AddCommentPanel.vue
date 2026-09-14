<template>
  <div>
    <v-textarea
      v-model="comment"
      name="comment"
      label="Comment"
      rows="3"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FlowNodeData } from '../../types'

const props = defineProps<{
  data: FlowNodeData
}>()

// Only one comment per node — a single field, not a growable list.
const comment = ref(props.data.comments?.[0] || '')

watch(
  () => props.data,
  (next) => {
    comment.value = next.comments?.[0] || ''
  }
)

// Edits here are staged locally — the drawer's "Update" button pulls the
// current value via this and commits it together with the title.
function getData(): Partial<FlowNodeData> {
  return { comments: comment.value ? [comment.value] : [] }
}

defineExpose({ getData })
</script>
