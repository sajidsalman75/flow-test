<template>
  <div class="d-flex flex-column ga-6">
    <section>
      <div class="text-subtitle-2 mb-2">Messages</div>
      <div v-for="(text, i) in localTexts" :key="i" class="d-flex align-center ga-2 mb-2">
        <v-text-field :model-value="text" density="compact" hide-details
          @update:model-value="(v: string) => updateText(i, v)" />
        <v-btn icon="mdi-close" size="small" variant="text" aria-label="Remove message" @click="removeText(i)" />
      </div>
      <v-btn variant="outlined" size="small" prepend-icon="mdi-plus" @click="addText">Add message</v-btn>
    </section>

    <section>
      <div class="text-subtitle-2 mb-2">Attachments</div>
      <div class="attachments-grid">
        <v-card v-for="att in localAttachments" :key="att.id" variant="outlined" class="attachment-tile">
          <v-img v-if="isImage(att)" :src="att.url" :alt="att.name" height="44" width="44" cover class="mx-auto" />
          <v-icon v-else icon="mdi-paperclip" size="24" />
          <p class="attachment-tile__name text-caption">{{ att.name }}</p>
          <v-btn icon="mdi-close" size="x-small" variant="text" class="attachment-tile__remove"
            aria-label="Remove attachment" @click="removeAttachment(att.id)" />
        </v-card>

        <v-btn variant="outlined" class="attachment-tile attachment-tile--upload" @click="triggerUpload">
          <v-icon icon="mdi-plus" start />
          Upload
        </v-btn>
        <input ref="fileInputRef" type="file" class="d-none" @change="handleUpload" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { AttachmentItem, FlowNodeData } from '../../types'

const props = defineProps<{
  data: FlowNodeData
}>()

const localTexts = reactive<string[]>([...(props.data.texts || [])])
const localAttachments = reactive<AttachmentItem[]>([...(props.data.attachments || [])])
const fileInputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.data,
  (next) => {
    localTexts.splice(0, localTexts.length, ...(next.texts || []))
    localAttachments.splice(0, localAttachments.length, ...(next.attachments || []))
  }
)

function updateText(index: number, value: string) {
  localTexts[index] = value
}

function addText() {
  localTexts.push('')
}

function removeText(index: number) {
  localTexts.splice(index, 1)
}

function isImage(att: AttachmentItem): boolean {
  return /\.(png|jpe?g|gif|webp)$/i.test(att.name) || att.url?.startsWith('data:image')
}

function triggerUpload() {
  fileInputRef.value?.click()
}

function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    localAttachments.push({ id: `att-${Date.now()}`, name: file.name, url: String(reader.result) })
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function removeAttachment(id: string) {
  const idx = localAttachments.findIndex((a) => a.id === id)
  if (idx !== -1) localAttachments.splice(idx, 1)
}

function getData(): Partial<FlowNodeData> {
  return { texts: [...localTexts], attachments: [...localAttachments] }
}

defineExpose({ getData })
</script>

<style scoped>
.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 10px;
}

.attachment-tile {
  position: relative;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 84px;
  text-align: center;
}

.attachment-tile__name {
  margin: 0;
  word-break: break-word;
}

.attachment-tile__remove {
  position: absolute;
  top: 2px;
  right: 2px;
}

.attachment-tile--upload {
  border-style: dashed;
}
</style>
