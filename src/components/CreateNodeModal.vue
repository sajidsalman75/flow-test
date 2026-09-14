<template>
  <v-dialog :model-value="open" max-width="460" @update:model-value="(v: boolean) => !v && close()">
    <v-card>
      <v-card-item>
        <v-card-title>{{ parentTitle ? `Add child of "${parentTitle}"` : 'Create new node' }}</v-card-title>
        <template #append>
          <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close" @click="close" />
        </template>
      </v-card-item>

      <v-form @submit.prevent="handleSubmit">
        <v-card-text class="d-flex flex-column ga-4">
          <v-text-field v-model="form.title" name="title" label="Title" placeholder="e.g. Ask for order number"
            :error-messages="errors.title ? [errors.title] : []" />

          <v-textarea v-model="form.description" name="description" label="Description" rows="3"
            placeholder="What does this node do?" :error-messages="errors.description ? [errors.description] : []" />

          <v-select v-model="form.type" name="type" label="Type of node" placeholder="Select a type…"
            :items="NODE_TYPE_OPTIONS" item-title="label" item-value="value"
            :error-messages="errors.type ? [errors.type] : []" />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="close">Cancel</v-btn>
          <v-btn type="submit" color="primary" variant="flat" :loading="isPending">Create node</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { NODE_TYPE_OPTIONS } from '../utils/nodeUtils'
import { validateNodeForm, isValid } from '../utils/validation'
import type { CreatableNodeType, CreateNodeFormValues, FormErrors } from '../types'

const props = defineProps<{
  open: boolean
  isPending?: boolean
  /** Set when opened via a node's + button, to label the modal with its parent. */
  parentTitle?: string | null
}>()

const emit = defineEmits<{
  close: []
  create: [payload: { title: string; description: string; type: CreatableNodeType }]
}>()

const form = reactive<CreateNodeFormValues>({ title: '', description: '', type: '' })
const errors = ref<FormErrors>({})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      form.title = ''
      form.description = ''
      form.type = ''
      errors.value = {}
    }
  }
)

function handleSubmit() {
  const validationErrors = validateNodeForm(form)
  errors.value = validationErrors
  if (!isValid(validationErrors)) return
  emit('create', {
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type as CreatableNodeType,
  })
}

function close() {
  emit('close')
}
</script>
