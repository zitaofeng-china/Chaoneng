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
      <ElFormItem v-if="showBotSelect" label="机器人" prop="bot_id">
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

      <ElFormItem label="语音" prop="lang">
        <ElSelect v-model="formData.lang" placeholder="请选择语音" style="width: 100%">
          <ElOption
            v-for="opt in REPLY_LANG_OPTIONS"
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
        v-if="!isStartKeyword"
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
import { useHtmlInsert } from '@/hooks/web/useHtmlInsert'
import FileUploader from '@/operation/components/MessageDialog/FileUploader.vue'
import InlineButtonSelector from '@/operation/components/MessageDialog/InlineButtonSelector.vue'
import VideoPreviewDialog from '@/operation/components/MessageDialog/components/VideoPreviewDialog.vue'
import MessagePreviewDialog from '@/operation/components/MessageDialog/components/MessagePreviewDialog.vue'
import InlineButtonDialog from '@/operation/components/InlineButtonDialog.vue'
import {
  MAX_MESSAGE_UPLOAD_FILES,
  MESSAGE_UPLOAD_OVERSIZE_MESSAGE,
  clampMessageUploadFiles,
  getMessageFileType,
  isMessageUploadFileOversize,
  toSingleFileUrl
} from '@/components/business/message/MessageDialog/messageFile'
import { v1GetInnerButtonList, type InnerButtonItem } from '@/api/opertion/common/menuList'
import { getErrorMessage } from '@/utils/messageHelper'
import {
  REPLY_LANG_OPTIONS,
  REPLY_LANG_SELECT_ALL,
  normalizeReplyLang,
  toReplyLangSelectValue
} from '@/constants/replyLang'
import type { MessagePreviewData } from '@/operation/components/MessageDialog/components/MessagePreviewDialog.vue'

export type ReplyBotOption = {
  label: string
  value: number | string
}

/** 弹窗内部使用的行数据类型（兼容 management/operation 列表行） */
export type ReplyFormRowData = {
  id?: number
  key_name?: string
  lang?: string
  content?: string
  status?: number
  file?: string
  inline_menu_ids?: Array<number | string>
  tg_bot_id?: number
  bot_username?: string
  bot_name?: string
}

export type ReplyFormSubmitParams = {
  id?: number
  tg_bot_id: number
  key_name: string
  lang: string
  content: string
  file: string
  inline_menu_ids: number[]
  inner_buttons: number[][]
  status: number
}

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  isEdit: { type: Boolean, default: false },
  rowData: { type: Object as PropType<ReplyFormRowData | null>, default: null },
  botOptions: { type: Array as PropType<ReplyBotOption[]>, default: () => [] },
  /** 注入上传实现，避免组件绑定具体系统 API */
  uploadFile: {
    type: Function as PropType<(data: FormData) => Promise<any>>,
    required: true
  },
  /** Marketing 需要「全部机器人」选项 */
  includeAllBotOption: { type: Boolean, default: false },
  /** 编辑时是否允许修改机器人 */
  allowEditBot: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'submitted'])

const { required } = useValidator()

// 表单 ref
const elFormRef = ref<FormInstance>()
// textarea ref（用于 useHtmlInsert 支持选中文字包裹）
const contentTextareaRef = ref()

const submitLoading = ref(false)

const dialogTitle = computed(() => (props.isEdit ? '编辑关键词回复' : '新增关键词回复'))

const ALL_BOT_OPTION: ReplyBotOption = { label: '全部', value: 0 }
const botSelectOptions = computed<ReplyBotOption[]>(() =>
  props.includeAllBotOption ? [ALL_BOT_OPTION, ...props.botOptions] : props.botOptions
)

const showBotSelect = computed(() => !props.isEdit || props.allowEditBot)

// 表单数据
const formData = ref({
  bot_id: undefined as number | undefined,
  keyword: '',
  lang: REPLY_LANG_SELECT_ALL,
  content: '',
  status: 1 as number
})

const isStartKeyword = computed(() => formData.value.keyword.trim() === '/start')

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

const normalizeFileList = (fileUrl = '') => {
  const url = toSingleFileUrl(fileUrl)
  if (!url) return []
  return [
    {
      name: url.split('/').pop()?.split('?')[0] || 'file',
      url,
      uid: 1
    }
  ] as UploadUserFile[]
}

const acceptedFilePattern = /^(image\/(png|jpeg|jpg|gif|webp)|video\/(mp4|avi|mov|quicktime))$/i

const isAcceptedUploadFile = (file?: File | null) => {
  if (!file) return false
  if (acceptedFilePattern.test(file.type)) return true
  return /\.(png|jpe?g|gif|webp|mp4|avi|mov)$/i.test(file.name || '')
}

const normalizeUploadFileList = (files: UploadUserFile[]) => {
  return clampMessageUploadFiles(files)
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
  const validFileList = fileList.filter((item) => !isMessageUploadFileOversize(item))
  const nextFileList = normalizeUploadFileList(validFileList)
  if (fileList.length > MAX_MESSAGE_UPLOAD_FILES) {
    ElMessage.warning('只能上传 1 个文件，请先删除已选文件后再上传')
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

const uploadSelectedFile = async () => {
  const fileItem = fileListRef.value[0]
  if (!fileItem) return ''

  if (fileItem.raw) {
    const formDataObj = new FormData()
    formDataObj.append('file', fileItem.raw)
    const res = await props.uploadFile(formDataObj)
    if (res && res.data) {
      const fileUrl = res.data.url || res.data.filename
      if (fileUrl) {
        return /^https?:\/\//.test(fileUrl) ? fileUrl : `${window.location.origin}/${fileUrl}`
      }
    }
    throw new Error(`文件 ${fileItem.name || ''} 上传失败`)
  }

  return fileItem.url || ''
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
  if (props.includeAllBotOption && botId === 0) return '-'

  if (
    props.isEdit &&
    props.rowData &&
    (formData.value.bot_id === undefined || formData.value.bot_id === null)
  ) {
    return (
      props.rowData.bot_username ||
      props.rowData.bot_name ||
      `机器人 ID: ${props.rowData.tg_bot_id}`
    )
  }

  const matchedBot = botSelectOptions.value.find((item) => Number(item.value) === botId)
  return matchedBot?.label || (botId ? `机器人 ID: ${botId}` : '')
}

const buildPreviewData = () => {
  previewData.value = {
    botName: getPreviewBotName(),
    content: formData.value.content,
    files: getPreviewFiles(),
    buttons: isStartKeyword.value ? [] : getSelectedInlineButtons()
  }
}

const replaceWithDroppedFile = (file: File) => {
  if (!isAcceptedUploadFile(file)) {
    ElMessage.warning('仅支持图片 PNG/JPEG/JPG/GIF/WEBP 或视频 MP4/AVI/MOV')
    return
  }

  if (isMessageUploadFileOversize(file)) {
    ElMessage.warning(MESSAGE_UPLOAD_OVERSIZE_MESSAGE)
    return
  }

  if (fileListRef.value.length >= MAX_MESSAGE_UPLOAD_FILES) {
    ElMessage.warning('只能上传 1 个文件，请先删除已选文件后再上传')
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

  if (fileListRef.value.length >= MAX_MESSAGE_UPLOAD_FILES) {
    ElMessage.warning('只能上传 1 个文件，请先删除已选文件后再上传')
    return
  }

  if (files.length > 1) {
    ElMessage.warning('只能上传 1 个文件')
  }

  replaceWithDroppedFile(files[0])
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
    lang: [required('请选择语音')],
    keyword: [required('关键词不能为空')],
    content: [required('回复内容不能为空')],
    status: [required('请选择状态')]
  }
  if (showBotSelect.value) {
    rules.bot_id = [required('请选择机器人')]
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
          bot_id: props.allowEditBot
            ? Number(props.rowData.tg_bot_id ?? (props.includeAllBotOption ? 0 : undefined))
            : undefined,
          keyword: props.rowData.key_name || '',
          lang: toReplyLangSelectValue(props.rowData.lang),
          content: props.rowData.content || '',
          status: props.rowData.status ?? 1
        }
        fileListRef.value = normalizeFileList(props.rowData.file)
        selectedInlineButtonIds.value = (props.rowData.inline_menu_ids || []).map((id) =>
          Number(id)
        )
      } else {
        const defaultBotId = props.includeAllBotOption
          ? (ALL_BOT_OPTION.value as number)
          : props.botOptions.length > 0
            ? (props.botOptions[0].value as number)
            : undefined
        formData.value = {
          bot_id: defaultBotId,
          keyword: '',
          lang: REPLY_LANG_SELECT_ALL,
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
    const uploadedFile = await uploadSelectedFile()
    const normalizedButtonLayout = isStartKeyword.value ? [] : normalizeButtonLayout(buttonLayout)
    const normalizedSelectedInlineButtonIds = isStartKeyword.value
      ? []
      : normalizedButtonLayout.length
        ? normalizedButtonLayout.flat()
        : selectedInlineButtonIds.value.map((id) => Number(id)).filter((id) => !isNaN(id))

    let params: ReplyFormSubmitParams

    if (props.isEdit && props.rowData?.id) {
      const processedKeywords = formData.value.keyword?.trim() || ''
      let botIdAsNumber: number
      if (props.allowEditBot) {
        botIdAsNumber = Number(formData.value.bot_id)
        if (isNaN(botIdAsNumber)) {
          ElMessage.error('机器人ID无效，请重新选择')
          return
        }
      } else {
        if (
          typeof props.rowData.tg_bot_id !== 'number' ||
          typeof props.rowData.key_name !== 'string'
        ) {
          ElMessage.error('无法编辑：原始机器人ID或关键词信息丢失')
          return
        }
        botIdAsNumber = props.rowData.tg_bot_id
      }
      params = {
        id: props.rowData.id,
        tg_bot_id: botIdAsNumber,
        key_name: processedKeywords,
        lang: normalizeReplyLang(formData.value.lang),
        content: formData.value.content,
        file: uploadedFile,
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
        lang: normalizeReplyLang(formData.value.lang),
        content: formData.value.content,
        file: uploadedFile,
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

defineExpose({
  get submitLoading() {
    return submitLoading.value
  },
  set submitLoading(value: boolean) {
    submitLoading.value = value
  }
})

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
