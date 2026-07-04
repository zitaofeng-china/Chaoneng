<template>
  <Dialog
    v-if="props.modelValue"
    :model-value="props.modelValue"
    @update:modelValue="handleModelUpdate"
    :title="dialogTitle"
    @close="handleClose"
    :close-on-click-modal="false"
  >
    <ElForm ref="elFormRef" :model="formData" :rules="formRules" label-width="100px">
      <!-- 新增模式：机器人选择 -->
      <ElFormItem v-if="!props.isEdit" label="机器人" prop="bot_id">
        <ElSelect
          v-model="formData.bot_id"
          placeholder="请选择机器人"
          filterable
          style="width: 100%"
        >
          <ElOption
            v-for="opt in botSelectOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="关键词" prop="keyword">
        <ElInput v-model="formData.keyword" placeholder="请输入关键词" />
      </ElFormItem>

      <!-- 回复内容编辑器 -->
      <ElFormItem label="回复内容" prop="content">
        <ElInput
          ref="contentTextareaRef"
          v-model="formData.content"
          type="textarea"
          :rows="5"
          placeholder="请输入回复内容"
        />
      </ElFormItem>

      <!-- 格式化按钮 - 与 MessageDialog 一致 -->
      <div class="formatting-buttons">
        <component :is="renderFormattingButtons()" />
      </div>

      <FileUploader
        :file-list="fileListRef"
        @preview="handlePreview"
        @change="handleFileChange"
        @remove="handleFileRemove"
      />

      <InlineButtonSelector
        v-model="selectedInlineButtonIds"
        :menu-list="menuList"
        @edit="openInlineButtonDialog"
      />

      <!-- 状态 -->
      <ElFormItem label="状态" prop="status">
        <ElRadioGroup v-model="formData.status">
          <ElRadioButton :label="1">启用</ElRadioButton>
          <ElRadioButton :label="2">禁用</ElRadioButton>
        </ElRadioGroup>
      </ElFormItem>
    </ElForm>

    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="handleClose" :disabled="submitLoading">取消</ElButton>
        <ElButton type="primary" :loading="submitLoading" @click="handleSubmit">确定</ElButton>
      </div>
    </template>
  </Dialog>

  <ElImageViewer
    v-if="showImageViewer && previewFileType === 'image'"
    :url-list="imageViewerSrcList"
    @close="showImageViewer = false"
    :initial-index="0"
  />

  <VideoPreviewDialog v-model:visible="showVideoViewer" :video-url="videoPreviewUrl" />

  <InlineButtonDialog v-model="inlineButtonDialogVisible" @success="fetchMenuList" />

  <MessagePreviewDialog
    v-model="showPreviewDialog"
    :preview-data="previewData"
    title="关键词预览"
    :submitting="submitLoading"
    @confirm="handleConfirmSubmit"
    @cancel="showPreviewDialog = false"
  />

  <div v-if="showDragMask" class="global-drag-mask">
    <div class="global-drag-mask__content">释放鼠标以上传图片或视频</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, type PropType, onBeforeUnmount } from 'vue'
import {
  ElButton,
  ElMessage,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElRadioGroup,
  ElRadioButton,
  ElImageViewer,
  type FormInstance
} from 'element-plus'
import type { UploadRawFile, UploadUserFile } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { useValidator } from '@/hooks/web/useValidator'
import type {
  ReplyItem,
  ReplySaveParams,
  BotOption
} from '@/api/opertion/Marketing/ReplyList/types'
import { useHtmlInsert } from '@/hooks/web/useHtmlInsert'
import FileUploader from '@/operation/components/MessageDialog/FileUploader.vue'
import InlineButtonSelector from '@/operation/components/MessageDialog/InlineButtonSelector.vue'
import VideoPreviewDialog from '@/operation/components/MessageDialog/components/VideoPreviewDialog.vue'
import MessagePreviewDialog from '@/operation/components/MessageDialog/components/MessagePreviewDialog.vue'
import InlineButtonDialog from '@/operation/components/InlineButtonDialog.vue'
import { getMessageFileType } from '@/operation/components/MessageDialog/utils'
import { uploadFileV2 as uploadFile } from '@/api/opertion/common/upload'
import { v1GetInnerButtonList, type InnerButtonItem } from '@/api/opertion/common/menuList'
import { getErrorMessage } from '@/utils/messageHelper'
import type { MessagePreviewData } from '@/operation/components/MessageDialog/components/MessagePreviewDialog.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  isEdit: { type: Boolean, default: false },
  rowData: { type: Object as PropType<ReplyItem | null>, default: null },
  botOptions: { type: Array as PropType<BotOption[]>, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'submitted'])

const { required } = useValidator()

// 表单 ref
const elFormRef = ref<FormInstance>()
// textarea ref（用于 useHtmlInsert 支持选中文字包裹）
const contentTextareaRef = ref()

const submitLoading = ref(false)

const dialogTitle = computed(() => (props.isEdit ? '编辑关键词回复' : '新增关键词回复'))

// 机器人下拉选项：在真实机器人列表前追加“全部”(value=0)
const ALL_BOT_OPTION: BotOption = { label: '-', value: 0 }
const botSelectOptions = computed<BotOption[]>(() => [ALL_BOT_OPTION, ...props.botOptions])

// 表单数据
const formData = ref({
  bot_id: undefined as number | undefined,
  keyword: '',
  content: '',
  status: 1 as number
})

const fileListRef = ref<UploadUserFile[]>([])
const selectedInlineButtonIds = ref<(number | string)[]>([])
const menuList = ref<InnerButtonItem[]>([])
const inlineButtonDialogVisible = ref(false)

const showImageViewer = ref(false)
const imageViewerSrcList = ref<string[]>([])
const showVideoViewer = ref(false)
const videoPreviewUrl = ref('')
const previewFileType = ref<'image' | 'video'>('image')
const showDragMask = ref(false)
const dragCounter = ref(0)
const showPreviewDialog = ref(false)
const previewData = ref<MessagePreviewData>({})

// 格式化按钮（传入 textareaRef，支持选中文字包裹）
const getContent = async () => formData.value.content || ''
const setContent = async (newContent: string) => {
  formData.value.content = newContent
}
const { renderFormattingButtons } = useHtmlInsert(getContent, setContent, contentTextareaRef)

const normalizeFileList = (files: string[] = []) => {
  return files.map((url, index) => ({
    name: url.split('/').pop()?.split('?')[0] || `file-${index + 1}`,
    url,
    uid: index + 1
  })) as UploadUserFile[]
}

const acceptedFilePattern = /^(image\/(png|jpeg|jpg|gif|webp)|video\/(mp4|avi|mov|quicktime))$/i
const MAX_UPLOAD_FILES = 10

const isAcceptedUploadFile = (file?: File | null) => {
  if (!file) return false
  if (acceptedFilePattern.test(file.type)) return true
  return /\.(png|jpe?g|gif|webp|mp4|avi|mov)$/i.test(file.name || '')
}

const normalizeUploadFileList = (files: UploadUserFile[]) => {
  return files.slice(0, MAX_UPLOAD_FILES)
}

const revokeBlobUrl = (url?: string) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

const cleanupBlobUrls = () => {
  fileListRef.value.forEach((file) => {
    if (file.url && file.raw) {
      revokeBlobUrl(file.url)
    }
  })
  revokeBlobUrl(videoPreviewUrl.value)
  imageViewerSrcList.value.forEach((url) => revokeBlobUrl(url))
  previewData.value.files?.forEach((file) => revokeBlobUrl(file.url))
}

const resetMediaState = () => {
  cleanupBlobUrls()
  fileListRef.value = []
  selectedInlineButtonIds.value = []
  showImageViewer.value = false
  imageViewerSrcList.value = []
  showVideoViewer.value = false
  videoPreviewUrl.value = ''
}

const fetchMenuList = async () => {
  try {
    const res = await v1GetInnerButtonList()
    if (res.code === '000000' && res.data) {
      menuList.value = res.data || []
    } else {
      menuList.value = []
    }
  } catch (error) {
    menuList.value = []
    ElMessage.error(getErrorMessage(error, '获取内联按钮列表失败'))
  }
}

const normalizeButtonLayout = (layout?: number[][]) => {
  if (!Array.isArray(layout)) return []
  return layout
    .filter((row) => Array.isArray(row) && row.length > 0)
    .map((row) => row.map((id) => Number(id)).filter((id) => !isNaN(id)))
    .filter((row) => row.length > 0)
}

const openInlineButtonDialog = () => {
  inlineButtonDialogVisible.value = true
}

const updateDragMask = (visible: boolean) => {
  showDragMask.value = visible && props.modelValue
}

const handlePreview = (uploadFile: UploadUserFile) => {
  const fileType = getMessageFileType(uploadFile)
  previewFileType.value = fileType

  if (fileType === 'video') {
    if (uploadFile.url) {
      videoPreviewUrl.value = uploadFile.url
      showVideoViewer.value = true
    } else if (uploadFile.raw) {
      revokeBlobUrl(videoPreviewUrl.value)
      videoPreviewUrl.value = URL.createObjectURL(uploadFile.raw)
      showVideoViewer.value = true
    } else {
      ElMessage.warning('无法预览视频，缺少视频地址')
    }
    return
  }

  if (uploadFile.url) {
    imageViewerSrcList.value = [uploadFile.url]
    showImageViewer.value = true
  } else if (uploadFile.raw) {
    imageViewerSrcList.value = [URL.createObjectURL(uploadFile.raw)]
    showImageViewer.value = true
  } else {
    ElMessage.warning('无法预览图片，缺少图片地址')
  }
}

const handleFileChange = (_file: UploadUserFile, fileList: UploadUserFile[]) => {
  const nextFileList = normalizeUploadFileList(fileList)
  if (fileList.length > MAX_UPLOAD_FILES) {
    ElMessage.warning(`图片和视频总共只能上传 ${MAX_UPLOAD_FILES} 个文件`)
  }

  nextFileList.forEach((uploadFile) => {
    if (uploadFile.raw && !uploadFile.url) {
      const fileType = getMessageFileType(uploadFile.raw)
      if (fileType === 'video') {
        uploadFile.url = URL.createObjectURL(uploadFile.raw)
      }
    }
  })

  fileListRef.value = nextFileList
}

const handleFileRemove = (file: UploadUserFile) => {
  const index = fileListRef.value.findIndex((item) => item.uid === file.uid)
  if (index > -1) {
    const currentFile = fileListRef.value[index]
    if (currentFile.url && currentFile.raw) {
      revokeBlobUrl(currentFile.url)
    }
    fileListRef.value.splice(index, 1)
  }

  ElMessage.info('文件已移除')
  return true
}

const uploadSelectedFiles = async () => {
  const uploadedFiles: string[] = []

  for (const fileItem of fileListRef.value) {
    if (fileItem.raw) {
      const formDataObj = new FormData()
      formDataObj.append('file', fileItem.raw)
      const res = await uploadFile(formDataObj)
      if (res && res.data) {
        const fileUrl = res.data.url || res.data.filename
        if (fileUrl) {
          uploadedFiles.push(
            /^https?:\/\//.test(fileUrl) ? fileUrl : `${window.location.origin}/${fileUrl}`
          )
          continue
        }
      }
      throw new Error(`文件 ${fileItem.name || ''} 上传失败`)
    }

    if (fileItem.url) {
      uploadedFiles.push(fileItem.url)
    }
  }

  return uploadedFiles
}

const getSelectedInlineButtons = () => {
  return selectedInlineButtonIds.value
    .map((id) => {
      const numericId = Number(id)
      const menu = menuList.value.find((item) => item.id === numericId)
      return menu ? { id: numericId, text: menu.text || '' } : null
    })
    .filter((item) => item !== null) as Array<{ id: number; text: string }>
}

const getPreviewFiles = () => {
  return fileListRef.value
    .map((file) => {
      if (file.url) {
        return {
          type: getMessageFileType(file),
          url: file.url,
          name: file.name || ''
        }
      }

      if (file.raw) {
        return {
          type: getMessageFileType(file.raw),
          url: URL.createObjectURL(file.raw),
          name: file.name || ''
        }
      }

      return null
    })
    .filter((item) => item !== null) as NonNullable<MessagePreviewData['files']>
}

const getPreviewBotName = () => {
  const botId = Number(formData.value.bot_id)
  if (botId === 0) return '-'
  const matchedBot = props.botOptions.find((item) => Number(item.value) === botId)
  return matchedBot?.label || (botId ? `机器人 ID: ${botId}` : '')
}

const buildPreviewData = () => {
  previewData.value = {
    botName: getPreviewBotName(),
    content: formData.value.content,
    files: getPreviewFiles(),
    buttons: getSelectedInlineButtons()
  }
}

const replaceWithDroppedFile = (file: File) => {
  if (!isAcceptedUploadFile(file)) {
    ElMessage.warning('仅支持图片 PNG/JPEG/JPG/GIF/WEBP 或视频 MP4/AVI/MOV')
    return
  }

  if (fileListRef.value.length >= MAX_UPLOAD_FILES) {
    ElMessage.warning(`图片和视频总共只能上传 ${MAX_UPLOAD_FILES} 个文件`)
    return
  }

  const uploadFileItem: UploadUserFile = {
    name: file.name,
    percentage: 0,
    raw: file as UploadRawFile,
    size: file.size,
    status: 'ready',
    uid: Date.now()
  }

  handleFileChange(uploadFileItem, [...fileListRef.value, uploadFileItem])
}

const extractDroppedFiles = (event: DragEvent) => {
  return Array.from(event.dataTransfer?.files || []).filter((file) => isAcceptedUploadFile(file))
}

const handleWindowDragEnter = (event: DragEvent) => {
  if (!props.modelValue) return
  if (!event.dataTransfer?.types?.includes('Files')) return
  event.preventDefault()
  dragCounter.value += 1
  updateDragMask(true)
}

const handleWindowDragOver = (event: DragEvent) => {
  if (!props.modelValue) return
  if (!event.dataTransfer?.types?.includes('Files')) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  updateDragMask(true)
}

const handleWindowDragLeave = (event: DragEvent) => {
  if (!props.modelValue) return
  if (!event.dataTransfer?.types?.includes('Files')) return
  event.preventDefault()
  dragCounter.value = Math.max(0, dragCounter.value - 1)
  if (dragCounter.value === 0) {
    updateDragMask(false)
  }
}

const handleWindowDrop = (event: DragEvent) => {
  if (!props.modelValue) return
  if (!event.dataTransfer?.types?.includes('Files')) return
  event.preventDefault()
  dragCounter.value = 0
  updateDragMask(false)

  const files = extractDroppedFiles(event)
  if (files.length === 0) {
    ElMessage.warning('未检测到可上传的图片或视频文件')
    return
  }

  files.forEach((file) => replaceWithDroppedFile(file))
}

const registerGlobalDragEvents = () => {
  window.addEventListener('dragenter', handleWindowDragEnter)
  window.addEventListener('dragover', handleWindowDragOver)
  window.addEventListener('dragleave', handleWindowDragLeave)
  window.addEventListener('drop', handleWindowDrop)
}

const unregisterGlobalDragEvents = () => {
  window.removeEventListener('dragenter', handleWindowDragEnter)
  window.removeEventListener('dragover', handleWindowDragOver)
  window.removeEventListener('dragleave', handleWindowDragLeave)
  window.removeEventListener('drop', handleWindowDrop)
  dragCounter.value = 0
  updateDragMask(false)
}

// 验证规则
const formRules = computed(() => {
  const rules: Record<string, any[]> = {
    bot_id: [required('请选择机器人')],
    keyword: [required('关键词不能为空')],
    content: [required('回复内容不能为空')],
    status: [required('请选择状态')]
  }
  return rules
})

// 监听弹窗打开，回填数据
watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      registerGlobalDragEvents()
      await elFormRef.value?.resetFields()
      await fetchMenuList()
      resetMediaState()
      if (props.isEdit && props.rowData) {
        formData.value = {
          bot_id: Number(props.rowData.tg_bot_id ?? 0),
          keyword: props.rowData.key_name || '',
          content: props.rowData.content || '',
          status: props.rowData.status ?? 1
        }
        fileListRef.value = normalizeFileList(props.rowData.files || [])
        selectedInlineButtonIds.value = (props.rowData.inline_menu_ids || []).map((id) =>
          Number(id)
        )
      } else {
        formData.value = {
          bot_id: ALL_BOT_OPTION.value as number,
          keyword: '',
          content: '',
          status: 1
        }
        fileListRef.value = []
        selectedInlineButtonIds.value = []
      }
    } else {
      unregisterGlobalDragEvents()
      resetMediaState()
      showPreviewDialog.value = false
      previewData.value = {}
    }
  }
)

const handleModelUpdate = (value: boolean) => {
  emit('update:modelValue', value)
}

const handleClose = () => {
  if (submitLoading.value) return
  emit('update:modelValue', false)
}

const handleSubmit = async () => {
  if (submitLoading.value) return

  const valid = await elFormRef.value?.validate().catch(() => false)
  if (!valid) {
    ElMessage.error('表单验证失败，请检查填写内容')
    return
  }

  buildPreviewData()
  showPreviewDialog.value = true
}

const handleConfirmSubmit = async (buttonLayout?: number[][]) => {
  if (submitLoading.value) return

  submitLoading.value = true
  try {
    const uploadedFiles = await uploadSelectedFiles()
    const normalizedButtonLayout = normalizeButtonLayout(buttonLayout)
    const normalizedSelectedInlineButtonIds = normalizedButtonLayout.length
      ? normalizedButtonLayout.flat()
      : selectedInlineButtonIds.value.map((id) => Number(id)).filter((id) => !isNaN(id))

    let params: ReplySaveParams

    if (props.isEdit && props.rowData?.id) {
      const botIdAsNumber = Number(formData.value.bot_id)
      if (isNaN(botIdAsNumber)) {
        ElMessage.error('机器人ID无效，请重新选择')
        return
      }
      const processedKeywords = formData.value.keyword?.trim() || ''
      params = {
        id: props.rowData.id,
        tg_bot_id: botIdAsNumber,
        key_name: processedKeywords,
        content: formData.value.content,
        files: uploadedFiles,
        inline_menu_ids: normalizedSelectedInlineButtonIds,
        inner_buttons: normalizedButtonLayout,
        status: formData.value.status
      }
    } else {
      const processedKeywords = formData.value.keyword?.trim() || ''
      const botIdAsNumber = Number(formData.value.bot_id)
      if (isNaN(botIdAsNumber)) {
        ElMessage.error('机器人ID无效，请重新选择')
        return
      }
      params = {
        tg_bot_id: botIdAsNumber,
        key_name: processedKeywords,
        content: formData.value.content,
        files: uploadedFiles,
        inline_menu_ids: normalizedSelectedInlineButtonIds,
        inner_buttons: normalizedButtonLayout,
        status: formData.value.status
      }
    }

    showPreviewDialog.value = false
    emit('submitted', params)
  } catch (error) {
    ElMessage.error('表单数据处理失败')
  } finally {
    submitLoading.value = false
  }
}

defineExpose({ submitLoading })

onBeforeUnmount(() => {
  unregisterGlobalDragEvents()
  cleanupBlobUrls()
})
</script>

<style scoped>
.formatting-buttons {
  display: flex;
  padding-left: 100px; /* 与 label-width 对齐 */
  margin-top: -12px;
  margin-bottom: 18px;
  gap: 8px;
  flex-wrap: wrap;
}

.global-drag-mask {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  background: rgb(64 158 255 / 12%);
  backdrop-filter: blur(2px);
  align-items: center;
  justify-content: center;
}

.global-drag-mask__content {
  min-width: 280px;
  padding: 28px 36px;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: #fff;
  border: 2px dashed var(--el-color-primary);
  border-radius: 12px;
  box-shadow: 0 12px 30px rgb(0 0 0 / 12%);
}
</style>
