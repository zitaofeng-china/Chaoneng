<template>
  <MessageFileUploader
    :file-list="fileList"
    @preview="(file) => emit('preview', file)"
    @change="(file, fileList) => emit('change', file, fileList)"
    @remove="(file) => emit('remove', file)"
  />
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import type { UploadUserFile } from 'element-plus'
import MessageFileUploader from '@/components/business/message/MessageDialog/components/MessageFileUploader.vue'

defineProps({
  fileList: {
    type: Array as PropType<UploadUserFile[]>,
    default: () => []
  }
})

const emit = defineEmits(['preview', 'change', 'remove'])
</script>
