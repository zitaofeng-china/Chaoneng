<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="800px">
    <ElForm
      ref="formRef"
      :model="formData"
      label-width="120px"
      style="max-height: 70vh; padding-right: 10px; overflow-y: auto"
    >
      <!-- 群组信息显示 -->
      <ElFormItem label="目标群组：">
        <div class="group-tag-container">
          <ElTag type="info" size="large" :disable-transitions="false" class="group-tag">
            {{ currentGroup?.name || '-' }} ({{ currentGroup?.id || '-' }})
          </ElTag>
        </div>
      </ElFormItem>

      <!-- 机器人选择（自动填充，禁用显示） -->
      <ElFormItem label="发送机器人：">
        <ElInput :value="currentBotName" disabled />
      </ElFormItem>

      <!-- 消息内容编辑器 -->
      <MessageContentEditor
        ref="messageContentEditorRef"
        v-model="formData.content"
        :show-formatting-buttons="true"
      >
        <template #formattingButtons>
          <component :is="renderFormattingButtons()" />
        </template>
      </MessageContentEditor>

      <!-- 文件上传器 -->
      <FileUploader
        :file-list="fileListRef"
        @preview="handlePreview"
        @change="handleFileChange"
        @remove="handleImageRemove"
      />

      <!-- 内联按钮选择器 -->
      <InlineButtonSelector
        v-model="checkList"
        :menu-list="menuList"
        @edit="openInlineButtonDialog"
      />

      <!-- 高级设置 -->
      <ElDivider content-position="left">
        <span class="text-sm text-gray-600">高级设置</span>
      </ElDivider>

      <!-- 启用周期和删除上次消息 -->
      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="启用周期">
            <template #label>
              <ElTooltip
                content="开启后可设置消息周期发送，关闭后将禁止消息周期发送"
                placement="top"
              >
                <span class="cursor-help">启用周期 <span class="text-primary">ⓘ</span></span>
              </ElTooltip>
            </template>
            <ElSwitch
              v-model="formData.enable_period"
              :active-value="true"
              :inactive-value="false"
              active-text="是"
              inactive-text="否"
              inline-prompt
              style="

--el-switch-on-color: #13ce66; --el-switch-off-color: #dcdfe6"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="删除上次消息">
            <template #label>
              <ElTooltip content="是否删除上一次发送的消息" placement="top">
                <span class="cursor-help">删除上次消息 <span class="text-primary">ⓘ</span></span>
              </ElTooltip>
            </template>
            <ElSwitch
              v-model="formData.delete_sent"
              :active-value="true"
              :inactive-value="false"
              active-text="是"
              inactive-text="否"
              inline-prompt
              style="

--el-switch-on-color: #13ce66; --el-switch-off-color: #dcdfe6"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <!-- 发送周期和发送时间 -->
      <ElRow :gutter="20">
        <ElCol :span="12" v-if="formData.enable_period">
          <ElFormItem label="发送周期">
            <template #label>
              <ElTooltip content="设置消息重复发送的周期（小时），最小值为1小时" placement="top">
                <span class="cursor-help">发送周期 <span class="text-primary">ⓘ</span></span>
              </ElTooltip>
            </template>
            <ElInputNumber
              v-model="formData.period"
              :min="1"
              :max="8760"
              placeholder="小时数"
              controls-position="right"
              class="period-input-center"
              style="width: 100%"
            >
              <template #suffix>
                <span class="text-gray-400 text-xs">小时</span>
              </template>
            </ElInputNumber>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="发送时间">
            <template #label>
              <ElTooltip
                content="选择消息发送的具体时间，只能选择当前时间5分钟之后，不选择则立即发送"
                placement="top"
              >
                <span class="cursor-help">发送时间 <span class="text-primary">ⓘ</span></span>
              </ElTooltip>
            </template>
            <ElDatePicker
              v-model="formData.send_at"
              type="datetime"
              placeholder="选择发送时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
              :clearable="true"
              :disabled-date="disabledDate"
              :disabled-hours="disabledHours"
              :disabled-minutes="disabledMinutes"
              :default-value="defaultSendTime"
              @focus="handleDatePickerFocus"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>
    </ElForm>
    <template #footer>
      <div class="flex justify-end">
        <ElButton @click="handleCancel">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">发送</ElButton>
      </div>
    </template>
  </Dialog>

  <!-- 图片预览 -->
  <ElImageViewer
    v-if="showImageViewer && previewFileType === 'image'"
    :url-list="imageViewerSrcList"
    @close="showImageViewer = false"
    :initial-index="0"
  />

  <!-- 视频预览 -->
  <VideoPreviewDialog v-model:visible="showVideoViewer" :video-url="videoPreviewUrl" />

  <!-- 内联按钮管理弹窗 -->
  <InlineButtonDialog v-model="inlineButtonDialogVisible" @success="fetchMenuList" />

  <!-- 消息预览对话框 -->
  <MessagePreviewDialog
    v-model="showMessagePreview"
    :preview-data="messagePreviewData"
    :submitting="submitting"
    @confirm="handleConfirmSend"
    @cancel="showMessagePreview = false"
  />
</template>

<script setup lang="tsx">
import { ref, computed, watch, onMounted } from 'vue'
import {
  ElButton,
  ElMessage,
  ElImageViewer,
  ElForm,
  ElRow,
  ElCol,
  ElFormItem,
  ElInputNumber,
  ElSwitch,
  ElDivider,
  ElTooltip,
  ElDatePicker,
  ElInput,
  ElTag
} from 'element-plus'
import type { UploadUserFile, FormInstance } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { v1SendGroupMessage } from '@/api/tgUser'
import { v1GetInnerButtonList } from '@/api/menu_list'
import type { InnerButtonItem } from '@/api/menu_list/types'
import { uploadFileV2 as uploadAPI } from '@/api/utils/upload'
import { useHtmlInsert } from '@/hooks/web/useHtmlInsert'

// 导入子组件
import MessageContentEditor from '@/operationView/Agent/components/MessageDialog/MessageContentEditor.vue'
import FileUploader from '@/operationView/Agent/components/MessageDialog/FileUploader.vue'
import InlineButtonSelector from '@/operationView/Agent/components/MessageDialog/InlineButtonSelector.vue'
import VideoPreviewDialog from '@/views/UserGroup/user_list/components/MessageDialog/components/VideoPreviewDialog.vue'
import MessagePreviewDialog from '@/views/UserGroup/user_list/components/MessageDialog/components/MessagePreviewDialog.vue'
import InlineButtonDialog from '@/operationView/Agent/MessageList/components/InlineButtonDialog.vue'
import type { MessagePreviewData } from '@/views/UserGroup/user_list/components/MessageDialog/components/MessagePreviewDialog.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  currentGroup: {
    type: Object as () => Record<string, any> | null,
    default: null
  },
  botList: {
    type: Array as () => Array<{ label: string; value: number | string }>,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const submitting = ref(false)
const formRef = ref<FormInstance>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const dialogTitle = computed(() => {
  return `发送消息到群组: ${props.currentGroup?.name || ''}`
})

// 当前机器人名称
const currentBotName = computed(() => {
  if (!props.currentGroup) return ''
  const bot = props.botList.find((b) => Number(b.value) === Number(props.currentGroup.bot_id))
  return bot?.label || props.currentGroup.bot_user_name || `机器人 ID: ${props.currentGroup.bot_id}`
})

// 表单数据
const formData = ref({
  content: '',
  period: 1,
  enable_period: false,
  delete_sent: false,
  send_at: '' as string | Date | number
})

// 内联按钮管理
const inlineButtonDialogVisible = ref(false)
const checkList = ref<(number | string)[]>([])
const menuList = ref<InnerButtonItem[]>([])

// 文件上传相关
const fileListRef = ref<UploadUserFile[]>([])

// 预览相关
const showImageViewer = ref(false)
const imageViewerSrcList = ref<string[]>([])
const showVideoViewer = ref(false)
const videoPreviewUrl = ref('')
const previewFileType = ref<'image' | 'video'>('image')

// 消息预览相关
const showMessagePreview = ref(false)
const messagePreviewData = ref<MessagePreviewData>({})

// 消息内容编辑器引用
const messageContentEditorRef = ref()

// 格式化按钮相关
const getContent = async () => formData.value.content || ''
const setContent = async (newContent: string) => {
  formData.value.content = newContent
}
const textareaRef = computed(() => messageContentEditorRef.value?.textareaRef)
const { renderFormattingButtons } = useHtmlInsert(getContent, setContent, textareaRef)

// 判断文件类型
const getFileType = (file: File | UploadUserFile): 'image' | 'video' => {
  const fileName = file.name || ''
  const fileType = (file as File).type || (file as UploadUserFile).raw?.type || ''

  if (fileType.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|mkv)$/i.test(fileName)) {
    return 'video'
  }
  return 'image'
}

// 文件预览
const handlePreview = (uploadFile: UploadUserFile) => {
  const fileType = getFileType(uploadFile)
  previewFileType.value = fileType

  if (fileType === 'video') {
    if (uploadFile.url) {
      videoPreviewUrl.value = uploadFile.url
      showVideoViewer.value = true
    } else if (uploadFile.raw) {
      if (videoPreviewUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl.value)
      }
      const objectURL = URL.createObjectURL(uploadFile.raw)
      videoPreviewUrl.value = objectURL
      showVideoViewer.value = true
    } else {
      ElMessage.warning('无法预览视频，缺少视频URL')
    }
  } else {
    if (uploadFile.url) {
      imageViewerSrcList.value = [uploadFile.url]
      showImageViewer.value = true
    } else if (uploadFile.raw) {
      const objectURL = URL.createObjectURL(uploadFile.raw)
      imageViewerSrcList.value = [objectURL]
      showImageViewer.value = true
    } else {
      ElMessage.warning('无法预览文件，缺少文件URL')
    }
  }
}

// 文件选择变化
const handleFileChange = (_file: UploadUserFile, fileList: UploadUserFile[]) => {
  fileList.forEach((uploadFile) => {
    if (uploadFile.raw && !uploadFile.url) {
      const fileType = getFileType(uploadFile.raw)
      if (fileType === 'video') {
        const blobUrl = URL.createObjectURL(uploadFile.raw)
        uploadFile.url = blobUrl
      }
    }
  })

  fileListRef.value = fileList
}

// 移除文件
const handleImageRemove = (file: UploadUserFile) => {
  const index = fileListRef.value.findIndex((f) => f.uid === file.uid)
  if (index > -1) {
    fileListRef.value.splice(index, 1)
  }

  ElMessage.info('文件已移除')
  return true
}

// 获取内联菜单列表
const fetchMenuList = async () => {
  try {
    const res = await v1GetInnerButtonList()
    if (res.code === '000000' && res.data) {
      menuList.value = res.data || []
    } else {
      menuList.value = []
    }
  } catch (error: any) {
    menuList.value = []
    console.error('获取内联菜单失败:', error)
    ElMessage.error('获取内联菜单失败: ' + (error?.msg || '未知错误'))
  }
}

// 打开内联按钮管理弹窗
const openInlineButtonDialog = () => {
  inlineButtonDialogVisible.value = true
}

// 取消操作
const handleCancel = () => {
  dialogVisible.value = false
}

// 提交消息 - 显示预览
const handleSubmit = async () => {
  if (!props.currentGroup) {
    ElMessage.error('未选择群组')
    return
  }

  // 准备预览数据
  const previewData: MessagePreviewData = {}

  // 机器人名称
  previewData.botName = currentBotName.value

  // 群组信息
  previewData.groupInfo = `群组: ${props.currentGroup.name} (ID: ${props.currentGroup.id})`

  // 消息内容
  previewData.content = formData.value.content

  // 文件列表
  if (fileListRef.value.length > 0) {
    previewData.files = fileListRef.value.map((file) => ({
      type: getFileType(file),
      url: file.url || (file.raw ? URL.createObjectURL(file.raw) : ''),
      name: file.name || ''
    }))
  }

  // 内联按钮（带 id，传给预览弹窗做行布局）
  if (checkList.value.length > 0) {
    previewData.buttons = checkList.value
      .map((id) => {
        const menu = menuList.value.find((m) => m.id === id)
        return menu ? { id: Number(id), text: menu.text || '' } : null
      })
      .filter((btn) => btn !== null) as Array<{ id: number; text: string; url?: string }>
  }

  messagePreviewData.value = previewData
  showMessagePreview.value = true
}

// 确认发送消息
const handleConfirmSend = async (buttonLayout?: number[][]) => {
  if (!props.currentGroup) {
    ElMessage.error('未选择群组')
    return
  }

  submitting.value = true

  try {
    // 先上传所有文件
    const uploadedFiles: string[] = []
    if (fileListRef.value.length > 0) {
      for (const fileItem of fileListRef.value) {
        if (fileItem.raw) {
          const formDataObj = new FormData()
          formDataObj.append('file', fileItem.raw)
          try {
            const res = await uploadAPI(formDataObj)
            if (res && res.data && res.data.filename) {
              const browserOrigin = window.location.origin
              uploadedFiles.push(`${browserOrigin}/${res.data.filename}`)
            } else {
              ElMessage.error(`文件 ${fileItem.name} 上传失败，未返回文件名`)
              submitting.value = false
              return
            }
          } catch (error: any) {
            console.error('文件上传错误:', error)
            ElMessage.error(`文件 ${fileItem.name} 上传失败: ${error?.message || '请重试'}`)
            submitting.value = false
            return
          }
        }
      }
    }

    // 处理内联按钮（使用预览中调整的二维布局）
    let innerButtons: number[][] = []
    if (buttonLayout && Array.isArray(buttonLayout) && buttonLayout.length > 0) {
      innerButtons = buttonLayout.filter((row) => Array.isArray(row) && row.length > 0)
    } else if (checkList.value.length > 0) {
      const ids = checkList.value
        .map((item: any) => {
          if (typeof item === 'object' && item !== null && 'id' in item) {
            return Number(item.id)
          }
          return typeof item === 'number' ? item : Number(item)
        })
        .filter((id: number) => !isNaN(id))
      if (ids.length > 0) innerButtons = [ids]
    }

    // 处理发送时间
    let sendAtTimestamp: number
    if (formData.value.send_at) {
      sendAtTimestamp = Math.floor(new Date(formData.value.send_at).getTime() / 1000)
    } else {
      sendAtTimestamp = Math.floor(Date.now() / 1000)
    }

    const apiParams: any = {
      bot_ids: [Number(props.currentGroup.bot_id)],
      content: formData.value.content,
      delete_sent: formData.value.delete_sent ? 1 : 2,
      files: uploadedFiles.length > 0 ? uploadedFiles : [],
      inner_buttons: innerButtons.length > 0 ? innerButtons : [],
      period: formData.value.enable_period
        ? formData.value.period >= 1
          ? formData.value.period
          : 1
        : 0,
      send_at: sendAtTimestamp,
      group_ids: [Number(props.currentGroup.id)]
    }

    // 使用 v1 接口
    await v1SendGroupMessage(apiParams)

    emit('success')
    ElMessage.success('发送消息请求成功')
    showMessagePreview.value = false
    dialogVisible.value = false
  } catch (error: any) {
    console.error('发送消息请求失败:', error)
    const errorMsg = error?.response?.data?.msg || error?.message || '发送消息请求失败，请重试'
    ElMessage.error(errorMsg)
  } finally {
    submitting.value = false
  }
}

// 监听对话框打开
watch(
  () => dialogVisible.value,
  async (val) => {
    if (val) {
      await fetchMenuList()
      // 重置字段
      checkList.value = []
      fileListRef.value = []
    } else {
      // 弹窗关闭时清空所有状态
      formRef.value?.resetFields()
      formData.value = {
        content: '',
        period: 1,
        enable_period: false,
        delete_sent: false,
        send_at: ''
      }
      menuList.value = []
      checkList.value = []
      fileListRef.value = []

      // 清理视频预览的 blob URL
      if (videoPreviewUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl.value)
      }
      videoPreviewUrl.value = ''
      showImageViewer.value = false
      showVideoViewer.value = false
      showMessagePreview.value = false
    }
  },
  { immediate: true }
)

// 监听启用周期开关变化
watch(
  () => formData.value.enable_period,
  (newVal, oldVal) => {
    if (newVal && !oldVal) {
      formData.value.period = 1
    }
    if (newVal && formData.value.period < 1) {
      formData.value.period = 1
    }
  }
)

// 日期时间选择器禁用逻辑
const disabledDate = (time: Date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return time.getTime() < today.getTime()
}

const defaultSendTime = computed(() => {
  const now = new Date()
  return now
})

const disabledHours = () => {
  const selectedDate = formData.value.send_at ? new Date(formData.value.send_at) : null
  if (!selectedDate) return []

  const now = new Date()
  const isToday =
    selectedDate.getFullYear() === now.getFullYear() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getDate() === now.getDate()

  if (isToday) {
    const currentHour = now.getHours()
    const disabledHoursList: number[] = []
    for (let i = 0; i < currentHour; i++) {
      disabledHoursList.push(i)
    }
    return disabledHoursList
  }
  return []
}

const disabledMinutes = (hour: number) => {
  const selectedDate = formData.value.send_at ? new Date(formData.value.send_at) : null
  if (!selectedDate) return []

  const now = new Date()
  const isToday =
    selectedDate.getFullYear() === now.getFullYear() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getDate() === now.getDate()

  if (isToday && hour === now.getHours()) {
    const minAllowedMinute = now.getMinutes() + 5
    const disabledMinutesList: number[] = []
    for (let i = 0; i < minAllowedMinute && i < 60; i++) {
      disabledMinutesList.push(i)
    }
    return disabledMinutesList
  }
  return []
}

const handleDatePickerFocus = () => {
  if (!formData.value.send_at) {
    const now = new Date()
    now.setMilliseconds(0)
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    formData.value.send_at = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
}

onMounted(() => {
  // 初始化逻辑
})
</script>

<style scoped>
.group-info-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-id-text {
  font-size: 14px;
  color: #909399;
}

/* 确保表单内容不会超出视口 */
:deep(.el-dialog__body) {
  max-height: 70vh;
  overflow-y: auto;
}

/* 优化滚动条样式 */
:deep(.el-dialog__body)::-webkit-scrollbar {
  width: 6px;
}

:deep(.el-dialog__body)::-webkit-scrollbar-thumb {
  background-color: rgb(0 0 0 / 20%);
  border-radius: 3px;
}

:deep(.el-dialog__body)::-webkit-scrollbar-track {
  background-color: transparent;
}

/* 优化表单项间距 */
:deep(.el-form-item) {
  margin-bottom: 18px;
}

/* 优化分割线样式 */
:deep(.el-divider) {
  margin: 24px 0 20px;
}

:deep(.el-divider__text) {
  padding: 0 12px;
  background-color: #fff;
}

/* 优化输入框样式 */
:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-input-number .el-input__inner) {
  text-align: left;
}

/* 发送周期输入框居中 */
:deep(.period-input-center .el-input__inner) {
  text-align: center;
}

/* 优化提示图标样式 */
.cursor-help {
  cursor: help;
}
</style>
