<template>
  <SharedReplyFormDialog
    ref="sharedRef"
    v-bind="props"
    :upload-file="uploadFile"
    include-all-bot-option
    allow-edit-bot
    @update:modelValue="(v) => emit('update:modelValue', v)"
    @submitted="(p) => emit('submitted', p)"
  />
</template>

<script setup lang="ts">
import { ref, type PropType } from 'vue'
import SharedReplyFormDialog from '@/components/business/reply/ReplyFormDialog.vue'
import type {
  ReplyItem,
  ReplySaveParams,
  BotOption
} from '@/api/opertion/Marketing/ReplyList/types'
import { uploadFileV2 as uploadFile } from '@/api/opertion/common/upload'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  isEdit: { type: Boolean, default: false },
  rowData: { type: Object as PropType<ReplyItem | null>, default: null },
  botOptions: { type: Array as PropType<BotOption[]>, default: () => [] }
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submitted', params: ReplySaveParams): void
}>()

const sharedRef = ref<InstanceType<typeof SharedReplyFormDialog> | null>(null)

defineExpose({
  get submitLoading() {
    return sharedRef.value?.submitLoading
  },
  set submitLoading(value: boolean) {
    if (sharedRef.value) {
      sharedRef.value.submitLoading = value
    }
  }
})
</script>
