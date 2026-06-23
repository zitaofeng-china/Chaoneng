<template>
  <div>
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
            <ElInput v-model="h5Config.url" placeholder="请输入H5地址" disabled />
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
              v-model="botProfile.introduction"
              class="profile-textarea"
              type="textarea"
              maxlength="200"
              show-word-limit
              placeholder="请输入机器人简介"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="机器人描述图片：">
            <input
              ref="descriptionImageFileInputRef"
              class="bot-image-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              @change="handleNativeFileChange($event, 'descriptionImage')"
            />
            <div
              class="upload-placeholder desc-image-placeholder"
              :class="{ 'is-dragover': dragoverField === 'descriptionImage' }"
              @click="handleUploadClick('descriptionImage')"
              @dblclick.stop.prevent="handleUploadDblClick('descriptionImage')"
              @dragover.prevent="handleImageDragover('descriptionImage')"
              @dragleave.prevent="handleImageDragleave('descriptionImage')"
              @drop.prevent="handleImageDrop($event, 'descriptionImage')"
            >
              <ElImage
                v-if="botProfile.descriptionImage"
                class="upload-preview"
                :src="botProfile.descriptionImage"
                fit="contain"
              />
              <div v-if="!botProfile.descriptionImage" class="upload-content">
                <Icon icon="ep:picture-filled" />
                <span>请上传图片</span>
              </div>
              <ElButton
                v-if="botProfile.descriptionImage"
                class="image-preview-button"
                link
                type="primary"
                @click.stop.prevent="previewImage(botProfile.descriptionImage)"
              >
                预览
              </ElButton>
            </div>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
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
import { uploadFile } from '@/api/management/common/upload'

const props = defineProps({
  tgStatus: {
    type: String,
    default: 'pending'
  },
  syncing: {
    type: Boolean,
    default: false
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

const botProfile = reactive({
  avatar: '',
  introduction: '',
  descriptionImage: '',
  descriptionContent: ''
})

const pendingImages = reactive<Record<'avatar' | 'descriptionImage', File | null>>({
  avatar: null,
  descriptionImage: null
})
const avatarFileInputRef = ref<HTMLInputElement>()
const descriptionImageFileInputRef = ref<HTMLInputElement>()
const imageViewerVisible = ref(false)
const imageViewerList = ref<string[]>([])
const dragoverField = ref<'avatar' | 'descriptionImage' | null>(null)
let uploadClickTimer: ReturnType<typeof setTimeout> | null = null

// 当前机器人ID
const currentBotId = ref<number | null>(null)
const lastLoadedSiteBotId = ref<number | null>(null)

const getCompatibleValue = (data: Record<string, any>, fields: string[]) => {
  const matchedField = fields.find((field) => data[field] !== undefined && data[field] !== null)
  return matchedField ? data[matchedField] || '' : ''
}

const isImageFile = (file?: File | null) => {
  if (!file) return false
  if (/^image\/(png|jpeg|jpg|gif|webp)$/i.test(file.type)) return true
  return /\.(png|jpe?g|gif|webp)$/i.test(file.name || '')
}

const replaceImageFile = (file: File | null, field: 'avatar' | 'descriptionImage') => {
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

const handleNativeFileChange = (event: Event, field: 'avatar' | 'descriptionImage') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  replaceImageFile(file, field)
  input.value = ''
}

const triggerFileSelect = (field: 'avatar' | 'descriptionImage') => {
  const input = field === 'avatar' ? avatarFileInputRef.value : descriptionImageFileInputRef.value
  input?.click()
}

const handleUploadClick = (field: 'avatar' | 'descriptionImage') => {
  if (uploadClickTimer) {
    clearTimeout(uploadClickTimer)
  }

  uploadClickTimer = setTimeout(() => {
    triggerFileSelect(field)
    uploadClickTimer = null
  }, 220)
}

const handleUploadDblClick = (field: 'avatar' | 'descriptionImage') => {
  if (uploadClickTimer) {
    clearTimeout(uploadClickTimer)
    uploadClickTimer = null
  }

  const imageUrl = botProfile[field]
  if (imageUrl) {
    previewImage(imageUrl)
  }
}

const handleImageDragover = (field: 'avatar' | 'descriptionImage') => {
  dragoverField.value = field
}

const handleImageDragleave = (field: 'avatar' | 'descriptionImage') => {
  if (dragoverField.value === field) {
    dragoverField.value = null
  }
}

const handleImageDrop = (event: DragEvent, field: 'avatar' | 'descriptionImage') => {
  dragoverField.value = null
  const file = event.dataTransfer?.files?.[0]
  replaceImageFile(file || null, field)
}

const previewImage = (url: string) => {
  if (!url) return
  imageViewerList.value = [url]
  imageViewerVisible.value = true
}

const uploadPendingImage = async (field: 'avatar' | 'descriptionImage') => {
  const file = pendingImages[field]
  if (!file) return botProfile[field]

  const formData = new FormData()
  formData.append('file', file)
  const res = await uploadFile(formData)
  const fileUrl = res?.data?.url || res?.data?.filename

  if (!fileUrl) {
    throw new Error('图片上传失败')
  }

  const normalizedUrl = /^https?:\/\//.test(fileUrl) ? fileUrl : `${window.location.origin}/${fileUrl}`
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

      botProfile.avatar = getCompatibleValue(data, ['avatar', 'photo', 'head_img', 'head_image'])
      botProfile.introduction = getCompatibleValue(data, ['introduction', 'intro', 'brief'])
      botProfile.descriptionImage = getCompatibleValue(data, [
        'description_image',
        'describe_image',
        'desc_image'
      ])
      botProfile.descriptionContent = getCompatibleValue(data, [
        'description',
        'description_content',
        'describe_content'
      ])
      pendingImages.avatar = null
      pendingImages.descriptionImage = null

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
      const [avatar, descriptionImage] = await Promise.all([
        uploadPendingImage('avatar'),
        uploadPendingImage('descriptionImage')
      ])

      return {
        ...formData,
        avatar,
        introduction: botProfile.introduction,
        description_image: descriptionImage,
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

.bot-profile-section {
  padding-top: 20px;
  margin-bottom: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
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
  background-color: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.2s,
    background-color 0.2s,
    color 0.2s;
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

/* H5配置区域样式 */
.h5-config-section {
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.h5-config-section :deep(.el-form-item) {
  display: flex;
  flex-direction: column;
}

.h5-config-section :deep(.el-form-item__label) {
  font-size: 14px;
  line-height: 32px;
  text-align: left;
  justify-content: flex-start;
}

.h5-config-section :deep(.el-form-item__content) {
  margin-left: 0 !important;
}
</style>
