<template>
  <div
    class="bot-info-tab"
    :class="{ 'is-dialog-dragover': isDialogDragover }"
    @dragenter.prevent="handleDialogDragenter"
    @dragover.prevent="handleDialogDragover"
    @dragleave.prevent="handleDialogDragleave"
    @drop.prevent="handleDialogDrop"
  >
    <!-- 机器人基本信息表单 -->
    <Form
      :isCol="true"
      labelPosition="top"
      :schema="botInfoSchema"
      @register="formRegister"
      :gridColumns="3"
    />

    <!-- H5配置区域 - 独立显示 -->
    <div class="h5-config-section">
      <ElRow :gutter="20">
        <ElCol :span="8">
          <ElFormItem label="地址：">
            <div class="h5-url-copy-wrap" title="点击复制地址" @click="handleCopyH5Url">
              <ElInput
                v-model="h5Config.url"
                class="h5-url-input"
                placeholder="请输入H5地址"
                disabled
              />
            </div>
          </ElFormItem>
        </ElCol>
        <ElCol :span="8">
          <ElFormItem label="客服账号：">
            <ElInput v-model="h5Config.site_tg_admin" placeholder="请输入客服账号" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="8">
          <ElFormItem label="H5端：">
            <ElSwitch v-model="h5Config.h5_enable" :active-value="1" :inactive-value="0" />
          </ElFormItem>
        </ElCol>
      </ElRow>
    </div>

    <div class="bot-profile-section">
      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="头像：">
            <input
              ref="avatarFileInputRef"
              class="bot-image-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              @change="handleNativeFileChange($event, 'avatar')"
            />
            <div
              class="upload-placeholder avatar-placeholder"
              :class="{ 'is-dragover': dragoverField === 'avatar' }"
              @click="handleUploadClick('avatar')"
              @dblclick.stop.prevent="handleUploadDblClick('avatar')"
              @dragover.prevent="handleImageDragover('avatar')"
              @dragleave.prevent="handleImageDragleave('avatar')"
              @drop.prevent="handleImageDrop($event, 'avatar')"
            >
              <ElImage
                v-if="botProfile.avatar"
                class="upload-preview"
                :src="botProfile.avatar"
                fit="contain"
              />
              <div v-if="!botProfile.avatar" class="upload-content">
                <Icon icon="ep:upload-filled" />
                <span>请上传头像</span>
              </div>
              <ElButton
                v-if="botProfile.avatar"
                class="image-preview-button"
                link
                type="primary"
                @click.stop.prevent="previewImage(botProfile.avatar)"
              >
                预览
              </ElButton>
            </div>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="简介：">
            <ElInput
              v-model="botProfile.shortDescription"
              class="profile-textarea"
              type="textarea"
              :maxlength="BOT_SHORT_DESCRIPTION_MAX_LENGTH"
              show-word-limit
              placeholder="请输入机器人简介"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="20">
        <ElCol :span="24">
          <ElFormItem label="机器人描述内容：">
            <ElInput
              v-model="botProfile.descriptionContent"
              class="profile-textarea"
              type="textarea"
              maxlength="500"
              show-word-limit
              placeholder="请输入内容"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>
    </div>

    <ElImageViewer
      v-if="imageViewerVisible"
      :url-list="imageViewerList"
      @close="imageViewerVisible = false"
    />

    <div v-if="isDialogDragover" class="dialog-upload-mask">
      <div class="dialog-upload-mask__content">
        <Icon icon="ep:upload-filled" />
        <span>松开鼠标，上传头像</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { reactive, ref, watch } from 'vue'
import { Form, FormSchema } from '@/components/Form'
import { Icon } from '@/components/Icon'
import { useForm } from '@/hooks/web/useForm'
import { useValidator } from '@/hooks/web/useValidator'
import {
  ElRow,
  ElCol,
  ElFormItem,
  ElSwitch,
  ElInput,
  ElImage,
  ElImageViewer,
  ElButton,
  ElMessage
} from 'element-plus'
import { v1GetSiteDetail } from '@/api/management/BotManage/common/site'
import { uploadFile, uploadFileV2 } from '@/api/management/common/upload'
import { useClipboard } from '@/hooks/web/useClipboard'

const props = defineProps({
  tgStatus: {
    type: String,
    default: 'pending'
  },
  syncing: {
    type: Boolean,
    default: false
  },
  uploadApiVersion: {
    type: String,
    default: 'v1'
  }
})

const emit = defineEmits(['sync-tg-status'])

// 表单相关
const { formRegister, formMethods } = useForm()
const { required } = useValidator()

// H5配置数据
const h5Config = ref({
  h5_enable: 0,
  url: '',
  site_tg_admin: ''
})

const { copy } = useClipboard()

const handleCopyH5Url = () => {
  const url = h5Config.value.url?.trim()
  if (!url) {
    ElMessage.warning('地址为空，无法复制')
    return
  }
  copy(url)
  ElMessage.success('地址复制成功')
}

const botProfile = reactive({
  avatar: '',
  shortDescription: '',
  descriptionContent: ''
})
const BOT_SHORT_DESCRIPTION_MAX_LENGTH = 120

const pendingImages = reactive<Record<'avatar', File | null>>({
  avatar: null
})
const avatarFileInputRef = ref<HTMLInputElement>()
const imageViewerVisible = ref(false)
const imageViewerList = ref<string[]>([])
const dragoverField = ref<'avatar' | null>(null)
const isDialogDragover = ref(false)
const dialogDragCounter = ref(0)
let uploadClickTimer: ReturnType<typeof setTimeout> | null = null

// 当前机器人ID
const currentBotId = ref<number | null>(null)
const lastLoadedSiteBotId = ref<number | null>(null)

const isImageFile = (file?: File | null) => {
  if (!file) return false
  if (/^image\/(png|jpeg|jpg|gif|webp)$/i.test(file.type)) return true
  return /\.(png|jpe?g|gif|webp)$/i.test(file.name || '')
}

const replaceImageFile = (file: File | null, field: 'avatar') => {
  if (!file) {
    ElMessage.warning('未获取到图片文件')
    return
  }

  if (!isImageFile(file)) {
    ElMessage.warning('仅支持 PNG/JPEG/JPG/GIF/WEBP 图片')
    return
  }

  pendingImages[field] = file
  botProfile[field] = URL.createObjectURL(file)
}

const handleNativeFileChange = (event: Event, field: 'avatar') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  replaceImageFile(file, field)
  input.value = ''
}

const triggerFileSelect = (field: 'avatar') => {
  if (field === 'avatar') {
    avatarFileInputRef.value?.click()
  }
}

const handleUploadClick = (field: 'avatar') => {
  if (uploadClickTimer) {
    clearTimeout(uploadClickTimer)
  }

  uploadClickTimer = setTimeout(() => {
    triggerFileSelect(field)
    uploadClickTimer = null
  }, 220)
}

const handleUploadDblClick = (field: 'avatar') => {
  if (uploadClickTimer) {
    clearTimeout(uploadClickTimer)
    uploadClickTimer = null
  }

  const imageUrl = botProfile[field]
  if (imageUrl) {
    previewImage(imageUrl)
  }
}

const handleImageDragover = (field: 'avatar') => {
  dragoverField.value = field
}

const handleImageDragleave = (field: 'avatar') => {
  if (dragoverField.value === field) {
    dragoverField.value = null
  }
}

const handleImageDrop = (event: DragEvent, field: 'avatar') => {
  dragoverField.value = null
  const file = event.dataTransfer?.files?.[0]
  replaceImageFile(file || null, field)
}

const hasImageDragFile = (event: DragEvent) => {
  const items = Array.from(event.dataTransfer?.items || [])
  return items.some((item) => item.kind === 'file' && item.type.startsWith('image/'))
}

const resetDialogDragState = () => {
  dialogDragCounter.value = 0
  isDialogDragover.value = false
}

const handleDialogDragenter = (event: DragEvent) => {
  if (!hasImageDragFile(event)) return
  dialogDragCounter.value += 1
  isDialogDragover.value = true
}

const handleDialogDragover = (event: DragEvent) => {
  if (!hasImageDragFile(event)) return
  isDialogDragover.value = true
}

const handleDialogDragleave = (event: DragEvent) => {
  if (!hasImageDragFile(event)) return
  dialogDragCounter.value = Math.max(dialogDragCounter.value - 1, 0)
  if (dialogDragCounter.value === 0) {
    isDialogDragover.value = false
  }
}

const handleDialogDrop = (event: DragEvent) => {
  if (!hasImageDragFile(event)) {
    resetDialogDragState()
    return
  }

  resetDialogDragState()
  const file = event.dataTransfer?.files?.[0] || null
  replaceImageFile(file, 'avatar')
}

const previewImage = (url: string) => {
  if (!url) return
  imageViewerList.value = [url]
  imageViewerVisible.value = true
}

const uploadPendingImage = async (field: 'avatar') => {
  const file = pendingImages[field]
  if (!file) return botProfile[field]

  const formData = new FormData()
  formData.append('file', file)
  const uploadApi = props.uploadApiVersion === 'v2' ? uploadFileV2 : uploadFile
  const res = await uploadApi(formData)
  const fileUrl = res?.data?.filename || res?.data?.url

  if (!fileUrl) {
    throw new Error('图片上传失败')
  }

  const normalizedUrl = /^https?:\/\//.test(fileUrl)
    ? fileUrl
    : `${window.location.origin}/${fileUrl}`
  botProfile[field] = normalizedUrl
  pendingImages[field] = null
  return normalizedUrl
}

// 获取Site详情
const fetchSiteDetail = async (botId: number) => {
  try {
    const res = await v1GetSiteDetail(botId)
    if (res && res.data) {
      lastLoadedSiteBotId.value = botId
      h5Config.value.url = res.data.url || ''
      h5Config.value.site_tg_admin = res.data.tg_admin || ''
      h5Config.value.h5_enable = res.data.status === 1 ? 1 : 0
    }
  } catch (error) {
    console.error('获取Site详情失败:', error)
  }
}

// 监听机器人ID变化，自动获取Site详情
watch(
  () => currentBotId.value,
  (newBotId) => {
    if (newBotId && newBotId !== lastLoadedSiteBotId.value) {
      fetchSiteDetail(newBotId)
    }
  },
  { immediate: true }
)

// 机器人信息表单
const botInfoSchema = reactive<FormSchema[]>([
  {
    field: 'tg_bot_id',
    component: 'Input' as const,
    label: '机器人ID：',
    componentProps: {
      disabled: true
    }
  },
  {
    field: 'name',
    component: 'Input' as const,
    label: '机器人用户名：',
    componentProps: {
      disabled: true
    }
  },
  {
    field: 'firstname',
    component: 'Input' as const,
    label: '机器人昵称：',
    componentProps: {
      placeholder: '请输入机器人昵称'
    },
    formItemProps: {
      rules: [required()]
    }
  },
  {
    field: 'visit_reward',
    component: 'InputNumber' as const,
    label: {
      text: '首充奖励',
      tips: '用户首次充值时额外奖励'
    },
    componentProps: {
      placeholder: '请输入首充奖励',
      min: 0,
      step: 0.1,
      precision: 2
    }
  },
  {
    field: 'invite_reward',
    component: 'InputNumber' as const,
    label: {
      text: '邀请奖励（TRX）- 非会员',
      tips: '被邀请人首充时才发放'
    },
    componentProps: {
      placeholder: '请输入非会员奖励',
      min: 0,
      step: 0.1,
      precision: 2
    }
  },
  {
    field: 'invite_reward_vip',
    component: 'InputNumber' as const,
    label: {
      text: '邀请奖励（TRX）- 会员',
      tips: '被邀请人首充时才发放'
    },
    componentProps: {
      placeholder: '请输入会员奖励',
      min: 0,
      step: 0.1,
      precision: 2
    }
  },
  {
    field: 'tg_admin',
    component: 'Input' as const,
    label: '管理员TG账号：',
    componentProps: {
      placeholder: '请输入TG账号,以@开头'
    },
    formItemProps: {
      rules: [
        required(),
        {
          pattern: /^@.+$/,
          message: 'TG账号必须以@开头'
        }
      ]
    }
  },
  {
    field: 'describe',
    component: 'Input' as const,
    label: '备注：',
    componentProps: {
      placeholder: '请输入备注(选填)',
      type: 'textarea',
      rows: 1
    }
  },
  {
    field: 'status',
    component: 'Switch' as const,
    label: '状态：',
    value: 1,
    componentProps: {
      activeValue: 1,
      inactiveValue: 2
    }
  }
])

defineExpose({
  formMethods: {
    ...formMethods,
    setValues: (data: any) => {
      formMethods.setValues(data)

      botProfile.avatar = data.avatar || ''
      botProfile.shortDescription = data.short_description || ''
      botProfile.descriptionContent = data.description || ''
      pendingImages.avatar = null

      if (data.tg_bot_id !== undefined && data.tg_bot_id !== currentBotId.value) {
        currentBotId.value = data.tg_bot_id
      }

      if (data.h5_enable !== undefined) h5Config.value.h5_enable = data.h5_enable
      if (data.url !== undefined) h5Config.value.url = data.url
      if (data.site_tg_admin !== undefined) {
        h5Config.value.site_tg_admin = data.site_tg_admin
      }
    },
    getFormData: async () => {
      const formData = await formMethods.getFormData()
      const avatar = await uploadPendingImage('avatar')

      return {
        ...formData,
        avatar,
        short_description: botProfile.shortDescription.slice(0, BOT_SHORT_DESCRIPTION_MAX_LENGTH),
        description: botProfile.descriptionContent,
        site_tg_admin: h5Config.value.site_tg_admin,
        h5_enable: h5Config.value.h5_enable,
        url: h5Config.value.url
      }
    }
  }
})
</script>

<style scoped>
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.tg-status-row {
  margin-top: 15px;
  margin-bottom: 25px;
  line-height: 32px;
}

.label-col {
  padding-right: 12px;
  color: var(--el-text-color-regular);
  text-align: right;
}

.el-form-item__label {
  font-size: 14px;
  line-height: 32px;
}

.syncing {
  animation: rotate 3s linear infinite;
}

.bot-info-tab {
  position: relative;
}

.bot-profile-section {
  padding-top: 20px;
  margin-bottom: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.bot-info-tab.is-dialog-dragover {
  user-select: none;
}

.bot-profile-section :deep(.el-form-item) {
  display: flex;
  flex-direction: column;
}

.bot-profile-section :deep(.el-form-item__label) {
  font-size: 14px;
  line-height: 32px;
  text-align: left;
  justify-content: flex-start;
}

.bot-profile-section :deep(.el-form-item__content) {
  margin-left: 0 !important;
}

.bot-image-input {
  display: none;
}

.upload-placeholder {
  position: relative;
  display: flex;
  width: 100%;
  height: 92px;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  background-color: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  transition:
    border-color 0.2s,
    background-color 0.2s,
    color 0.2s;
  align-items: center;
  justify-content: center;
}

.upload-placeholder:hover {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.upload-placeholder.is-dragover {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
  border-style: solid;
}

.upload-content {
  position: absolute;
  z-index: 3;
  display: flex;
  line-height: 20px;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.upload-content.is-preview {
  right: 0;
  bottom: 0;
  left: 0;
  padding: 6px 10px;
  color: #fff;
  background: rgb(0 0 0 / 45%);
}

.upload-content :deep(.el-icon),
.upload-content :deep(svg) {
  flex: 0 0 auto;
}

.image-preview-button {
  position: absolute;
  top: 8px;
  right: 10px;
  z-index: 4;
  padding: 2px 8px;
  color: var(--el-color-primary);
  background: rgb(255 255 255 / 88%);
  border-radius: 4px;
}

.profile-textarea {
  width: 100%;
}

.profile-textarea :deep(.el-textarea__inner) {
  height: 92px;
  min-height: 92px !important;
  resize: none;
}

.avatar-placeholder,
.desc-image-placeholder {
  height: 92px;
}

.upload-preview {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  background-color: #fff;
}

.dialog-upload-mask {
  position: absolute;
  z-index: 20;
  inset: 0;
  display: flex;
  pointer-events: none;
  background: rgb(64 158 255 / 12%);
  border: 2px dashed var(--el-color-primary);
  border-radius: 8px;
  align-items: center;
  justify-content: center;
}

.dialog-upload-mask__content {
  display: flex;
  padding: 18px 28px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: rgb(255 255 255 / 96%);
  border-radius: 999px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
  align-items: center;
  gap: 10px;
}

/* H5配置区域样式 */
.h5-config-section {
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

/* 真正 disabled 保持灰色；外层接管点击以支持复制，宽度与同行字段一致 */
.h5-url-copy-wrap {
  display: block;
  width: 100%;
  min-width: 0;
  cursor: pointer;
  box-sizing: border-box;

  :deep(.el-input) {
    display: block;
    width: 100% !important;
    pointer-events: none;
  }

  :deep(.el-input__wrapper) {
    width: 100%;
    cursor: pointer;
  }

  :deep(.el-input__inner) {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }
}

.h5-config-section :deep(.el-form-item) {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.h5-config-section :deep(.el-form-item__label) {
  font-size: 14px;
  line-height: 32px;
  text-align: left;
  justify-content: flex-start;
}

.h5-config-section :deep(.el-form-item__content) {
  display: block;
  width: 100%;
  margin-left: 0 !important;
}
</style>
