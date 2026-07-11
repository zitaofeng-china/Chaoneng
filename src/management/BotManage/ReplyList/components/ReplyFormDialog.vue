<template>
  <SharedReplyFormDialog
    ref="sharedRef"
    v-bind="props"
    :upload-file="uploadFile"
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
} from '@/api/management/BotManage/ReplyList/types'
import { uploadFile } from '@/api/management/common/upload'

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
