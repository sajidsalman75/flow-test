<template>
  <div class="d-flex flex-column ga-4">
    <table class="hours-table w-100">
      <thead>
        <tr>
          <th><v-icon icon="mdi-calendar" size="14" start />Day</th>
          <th colspan="2"><v-icon icon="mdi-clock-outline" size="14" start />Time</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="day in DAYS" :key="day">
          <td class="hours-table__day">{{ day }}</td>
          <td>
            <v-text-field type="time" :model-value="rowFor(day).open" density="compact" hide-details
              class="hours-table__time" @update:model-value="(v: string) => updateSlot(day, 'open', v)" />
          </td>
          <td class="hours-table__sep">to</td>
          <td>
            <v-text-field type="time" :model-value="rowFor(day).close" density="compact" hide-details
              class="hours-table__time" @update:model-value="(v: string) => updateSlot(day, 'close', v)" />
          </td>
        </tr>
      </tbody>
    </table>
    <v-alert v-if="rangeError" type="error" variant="tonal" density="compact">{{ rangeError }}</v-alert>

    <v-select v-model="timezone" label="Time Zone" :items="TIMEZONES" />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { validateBusinessHour } from '../../utils/validation'
import type { BusinessHourSlot, FlowNodeData } from '../../types'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIMEZONES = ['UTC', '(GMT+00:00) UTC', '(GMT+08:00) Asia/Kuala_Lumpur', '(GMT+05:30) Asia/Kolkata', '(GMT-05:00) America/New_York']

const props = defineProps<{
  data: FlowNodeData
}>()

// Fixed Mon-Sun schema (matches the mockup), only
// editing each day's open/close time.
const rows = reactive<Record<string, { open: string; close: string }>>(
  Object.fromEntries(DAYS.map((day) => [day, { open: '', close: '' }]))
)
const timezone = ref(props.data.timezone || 'UTC')
const rangeError = ref('')

function applyIncoming(hours: BusinessHourSlot[] | undefined) {
  DAYS.forEach((day) => {
    const match = hours?.find((h) => h.day === day)
    rows[day] = { open: match?.open || '', close: match?.close || '' }
  })
}

applyIncoming(props.data.hours)

watch(
  () => props.data,
  (next) => {
    applyIncoming(next.hours)
    timezone.value = next.timezone || 'UTC'
  }
)

function rowFor(day: string) {
  return rows[day]
}

function updateSlot(day: string, field: 'open' | 'close', value: string) {
  rows[day] = { ...rows[day], [field]: value }
  validate()
}

const hoursPayload = computed<BusinessHourSlot[]>(() =>
  DAYS.filter((day) => rows[day].open && rows[day].close).map((day) => ({ day, ...rows[day] }))
)

function validate(): boolean {
  const firstError = hoursPayload.value
    .map((slot) => validateBusinessHour(slot))
    .find((err) => Object.keys(err).length > 0)
  rangeError.value = firstError?.close || firstError?.open || firstError?.day || ''
  return !rangeError.value
}

function getData(): Partial<FlowNodeData> | null {
  if (!validate()) return null
  return { hours: hoursPayload.value, timezone: timezone.value }
}

defineExpose({ getData })
</script>

<style scoped>
.hours-table {
  border-collapse: collapse;
  font-size: 12.5px;
}

.hours-table th {
  text-align: left;
  font-weight: 600;
  color: #667085;
  font-size: 11.5px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eef0f3;
}

.hours-table td {
  padding: 4px;
}

.hours-table__day {
  font-weight: 600;
  color: #344054;
  white-space: nowrap;
}

.hours-table__sep {
  color: #98a2b3;
  font-size: 11px;
  text-align: center;
}

.hours-table__time {
  width: 110px;
}
</style>
