<template>
  <div class="app-container">
    <ContentWrap>
      <SearchTable
        ref="searchTableRef"
        :columns="columns"
        :search-schema="searchSchema"
        :fetch-data-api="fetchData"
        :table-props="{ rowKey: 'id' }"
        add-button-text="新增广告"
        @add="handleAdd"
      />

      <Dialog v-model="formDialogVisible" :title="formDialogTitle" width="680px">
        <ElForm ref="formRef" :model="formData" :rules="formRules" label-width="110px">
          <ElFormItem label="广告标题:" prop="title">
            <ElInput
              v-model="formData.title"
              placeholder="请输入广告标题"
              maxlength="100"
              show-word-limit
              clearable
            />
          </ElFormItem>

          <ElFormItem label="图片:" prop="image_url">
            <div class="image-form-field">
              <div class="image-input-row">
                <ElInput
                  v-model="formData.image_url"
                  placeholder="请输入图片地址，或点击右侧上传"
                  clearable
                />
                <ElUpload
                  action="#"
                  accept="image/png,image/jpeg,image/webp"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="handleImageChange"
                >
                  <BaseButton type="primary" :loading="uploading">上传图片</BaseButton>
                </ElUpload>
              </div>
              <ElImage
                v-if="formData.image_url"
                :src="resolveImageSource(formData.image_url)"
                fit="cover"
                class="form-image-preview"
                preview-teleported
                :preview-src-list="[resolveImageSource(formData.image_url)]"
              >
                <template #error>
                  <div class="image-error-placeholder">图片加载失败</div>
                </template>
              </ElImage>
              <span class="field-tip">
                仅支持 JPG、PNG、WebP；上传后可裁剪为 4:1 横幅，裁剪结果大小不超过 2MB，推荐
                1600×400 或 1920×480。
              </span>
            </div>
          </ElFormItem>

          <ElFormItem label="跳转地址:" prop="link_url">
            <ElInput
              v-model="formData.link_url"
              type="textarea"
              :rows="2"
              placeholder="请输入 http/https 跳转地址"
              maxlength="500"
              show-word-limit
            />
          </ElFormItem>

          <ElFormItem label="排序:" prop="sort">
            <ElInputNumber
              v-model="formData.sort"
              :min="0"
              :precision="0"
              controls-position="right"
            />
          </ElFormItem>

          <ElFormItem label="状态:" prop="status">
            <ElSwitch
              v-model="formData.status"
              :active-value="1"
              :inactive-value="2"
              active-text="启用"
              inactive-text="停用"
              inline-prompt
            />
          </ElFormItem>
        </ElForm>

        <template #footer>
          <div class="flex justify-end">
            <ElButton :disabled="submitting || uploading" @click="formDialogVisible = false">
              取消
            </ElButton>
            <ElButton
              type="primary"
              :loading="submitting"
              :disabled="uploading"
              @click="submitForm"
            >
              确定
            </ElButton>
          </div>
        </template>
      </Dialog>

      <Dialog v-model="cropDialogVisible" title="裁剪广告图片" width="760px">
        <div class="cropper-container">
          <img
            v-if="cropperImageUrl"
            ref="cropperImageRef"
            :src="cropperImageUrl"
            alt="待裁剪广告图片"
            class="cropper-image"
            @load="initializeCropper"
          />
        </div>
        <div class="cropper-tip">
          请调整图片位置和裁剪区域，最终会按 4:1 横幅比例上传，最长边不超过 1920px。
        </div>

        <template #footer>
          <div class="flex justify-end">
            <ElButton :disabled="uploading" @click="cancelCrop">取消</ElButton>
            <ElButton type="primary" :loading="uploading" @click="confirmCrop">
              裁剪并上传
            </ElButton>
          </div>
        </template>
      </Dialog>
    </ContentWrap>
  </div>
</template>

<script setup lang="tsx">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElImage,
  ElInput,
  ElInputNumber,
  ElMessageBox,
  ElSwitch,
  ElUpload
} from 'element-plus'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.min.css'
import { BaseButton } from '@/components/Button'
import { ContentWrap } from '@/components/ContentWrap'
import { Dialog } from '@/components/Dialog'
import { SearchTable } from '@/components/SearchTable'
import type { FormSchema } from '@/components/Form'
import type { TableColumn } from '@/components/Table'
import {
  createAdBanner,
  deleteAdBanner,
  getAdBannerList,
  updateAdBanner,
  type AdBannerItem,
  type AdBannerListParams,
  type SaveAdBannerParams
} from '@/api/opertion/Marketing/AdBanner'
import { uploadFileV2 as uploadImageFile } from '@/api/opertion/common/upload'
import {
  handleErrorMessage,
  handleSuccessMessage,
  handleWarningMessage
} from '@/utils/messageHelper'
import { createPageParams, formatTableDateTime, hasSearchValue } from '@/utils/tableHelpers'

type AdBannerSearchParams = AdBannerListParams

interface AdBannerForm {
  id?: number
  image_url: string
  link_url: string
  sort: number
  status: number
  title: string
}

const DEFAULT_FORM: AdBannerForm = {
  id: undefined,
  image_url: '',
  link_url: '',
  sort: 100,
  status: 1,
  title: ''
}

const IMAGE_MAX_SIZE = 2 * 1024 * 1024
const BANNER_ASPECT_RATIO = 16 / 7
const BANNER_MAX_WIDTH = 1920
const IMAGE_FORMAT_MESSAGE = '仅支持 JPG、PNG、WebP 图片'

const STATUS_OPTIONS = [
  { label: '启用', value: 1 },
  { label: '停用', value: 2 }
]

const searchTableRef = ref<InstanceType<typeof SearchTable> | null>(null)
const formRef = ref<FormInstance>()
const formDialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const submitting = ref(false)
const uploading = ref(false)
const cropDialogVisible = ref(false)
const cropperImageUrl = ref('')
const cropperImageRef = ref<HTMLImageElement>()
const cropperSourceFile = ref<File>()
const cropperInstance = ref<Cropper>()
const formData = reactive<AdBannerForm>({ ...DEFAULT_FORM })

const formDialogTitle = computed(() =>
  dialogMode.value === 'add' ? '新增广告横幅' : '编辑广告横幅'
)

const normalizeNumber = (value: number | string | undefined, fallback = 0) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

const normalizeStatus = (value: number | string | undefined) => (Number(value) === 2 ? 2 : 1)

const isHttpUrl = (value: string) => {
  const text = String(value || '').trim()
  if (!text) return false

  try {
    const url = new URL(text)
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname)
  } catch {
    return false
  }
}

const normalizeUploadedImageUrl = (url?: string, filename?: string) => {
  return String(url || filename || '').trim()
}

const resolveImageSource = (value: string) => {
  const text = String(value || '').trim()
  if (!text) return ''

  try {
    const baseUrl =
      (window as any).APP_CONFIG?.API_BASE_URL ||
      import.meta.env.VITE_API_BASE_PATH ||
      window.location.origin
    return new URL(text, baseUrl).toString()
  } catch {
    return text
  }
}

const validateRequiredText = (label: string) => {
  return (_rule: unknown, value: string, callback: (error?: Error) => void) => {
    const text = String(value || '').trim()
    if (!text) {
      callback(new Error(`请输入${label}`))
      return
    }
    callback()
  }
}

const validateHttpUrl = (label: string) => {
  return (_rule: unknown, value: string, callback: (error?: Error) => void) => {
    const text = String(value || '').trim()
    if (!text) {
      callback(new Error(`请输入${label}`))
      return
    }
    if (!isHttpUrl(text)) {
      callback(new Error(`${label}仅支持 http/https URL`))
      return
    }
    callback()
  }
}

const hasBytes = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte)

const hasSupportedImageSignature = async (file: File) => {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  return (
    hasBytes(header, [0xff, 0xd8, 0xff]) ||
    hasBytes(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ||
    (hasBytes(header, [0x52, 0x49, 0x46, 0x46]) && hasBytes(header, [0x57, 0x45, 0x42, 0x50], 8))
  )
}

const getImageDimensions = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      image.onload = null
      image.onerror = null
    }

    image.onload = () => {
      const width = image.naturalWidth || image.width
      const height = image.naturalHeight || image.height
      cleanup()
      if (!width || !height) {
        reject(new Error('无法读取图片尺寸'))
        return
      }
      resolve({ width, height })
    }
    image.onerror = () => {
      cleanup()
      reject(new Error('图片文件无效'))
    }
    image.src = objectUrl
  })

const getOutputImageMimeType = (file: File) => {
  if (file.type === 'image/png') return 'image/png'
  if (file.type === 'image/webp') return 'image/webp'
  return 'image/jpeg'
}

const destroyCropper = () => {
  cropperInstance.value?.destroy()
  cropperInstance.value = undefined
}

const clearCropperSource = () => {
  destroyCropper()
  if (cropperImageUrl.value) {
    URL.revokeObjectURL(cropperImageUrl.value)
  }
  cropperImageUrl.value = ''
  cropperSourceFile.value = undefined
}

const initializeCropper = () => {
  const image = cropperImageRef.value
  if (!image) return

  destroyCropper()
  cropperInstance.value = new Cropper(image, {
    aspectRatio: BANNER_ASPECT_RATIO,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 1,
    background: false,
    responsive: true,
    restore: false,
    guides: true,
    center: true,
    cropBoxMovable: true,
    cropBoxResizable: true,
    toggleDragModeOnDblclick: false
  })
}

const openCropDialog = async (file: File) => {
  clearCropperSource()
  cropperSourceFile.value = file
  cropperImageUrl.value = URL.createObjectURL(file)
  cropDialogVisible.value = true
  await nextTick()

  if (cropperImageRef.value?.complete) {
    initializeCropper()
  }
}

const closeCropDialog = () => {
  cropDialogVisible.value = false
  clearCropperSource()
}

const createCroppedFile = () =>
  new Promise<File>((resolve, reject) => {
    const cropper = cropperInstance.value
    const sourceFile = cropperSourceFile.value
    if (!cropper || !sourceFile) {
      reject(new Error('请先完成图片裁剪'))
      return
    }

    const cropData = cropper.getData(true)
    const outputWidth = Math.min(Math.max(1, Math.round(cropData.width)), BANNER_MAX_WIDTH)
    const outputHeight = Math.max(1, Math.round(outputWidth / BANNER_ASPECT_RATIO))
    const outputMimeType = getOutputImageMimeType(sourceFile)
    const canvas = cropper.getCroppedCanvas({
      width: outputWidth,
      height: outputHeight,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    })

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('图片裁剪失败'))
          return
        }

        const filename = sourceFile.name.replace(/\.[^.]+$/, '') || 'ad-banner'
        const extension =
          outputMimeType === 'image/png' ? 'png' : outputMimeType === 'image/webp' ? 'webp' : 'jpg'
        resolve(
          new File([blob], `${filename}-cropped.${extension}`, {
            type: blob.type || outputMimeType,
            lastModified: Date.now()
          })
        )
      },
      outputMimeType,
      outputMimeType === 'image/png' ? undefined : 0.9
    )
  })

onBeforeUnmount(clearCropperSource)

const formRules: FormRules<AdBannerForm> = {
  title: [{ validator: validateRequiredText('广告标题'), trigger: 'blur' }],
  image_url: [{ validator: validateRequiredText('图片地址'), trigger: 'blur' }],
  link_url: [{ validator: validateHttpUrl('跳转地址'), trigger: 'blur' }],
  sort: [
    { required: true, message: '请输入排序值', trigger: 'change' },
    { type: 'number', min: 0, message: '排序值不能小于 0', trigger: 'change' }
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const renderImage = (row: AdBannerItem) => {
  if (!row.image_url) {
    return <span class="ad-image-empty">暂无图片</span>
  }

  const imageSource = resolveImageSource(row.image_url)

  return (
    <ElImage
      src={imageSource}
      fit="cover"
      class="table-image-preview"
      style={{ width: '80px', height: '44px' }}
      preview-teleported
      preview-src-list={[imageSource]}
    >
      {{
        error: () => <span class="image-error-placeholder">图片加载失败</span>
      }}
    </ElImage>
  )
}

const renderStatus = (row: AdBannerItem) => (
  <ElSwitch
    modelValue={normalizeStatus(row.status)}
    activeValue={1}
    inactiveValue={2}
    activeText="启用"
    inactiveText="停用"
    inlinePrompt
    onChange={(value: boolean | number | string) => handleStatusChange(row, value)}
  />
)

const columns: TableColumn[] = [
  {
    field: 'title',
    label: '广告标题',
    minWidth: 220
  },
  {
    field: 'image_url',
    label: '图片',
    width: 160,
    showOverflowTooltip: false,
    formatter: renderImage
  },
  {
    field: 'link_url',
    label: '跳转地址',
    minWidth: 300
  },
  {
    field: 'sort',
    label: '排序',
    width: 100,
    sortable: 'custom',
    align: 'center',
    formatter: (row: AdBannerItem) => normalizeNumber(row.sort)
  },
  {
    field: 'status',
    label: '状态',
    width: 120,
    showOverflowTooltip: false,
    formatter: renderStatus
  },
  {
    field: 'created_at',
    label: '创建时间',
    width: 180,
    formatter: (row: AdBannerItem) => formatTableDateTime(row.created_at)
  },
  {
    field: 'updated_at',
    label: '修改时间',
    width: 180,
    formatter: (row: AdBannerItem) => formatTableDateTime(row.updated_at)
  },
  {
    field: 'action',
    label: '操作',
    width: 160,
    fixed: 'right',
    showOverflowTooltip: false,
    formatter: (row: AdBannerItem) => (
      <div class="ad-action-buttons">
        <BaseButton type="primary" onClick={() => handleEdit(row)}>
          编辑
        </BaseButton>
        <BaseButton type="danger" onClick={() => handleDelete(row)}>
          删除
        </BaseButton>
      </div>
    )
  }
]

const searchSchema = reactive<FormSchema[]>([
  {
    field: 'status',
    component: 'Select',
    label: '状态',
    componentProps: {
      placeholder: '全部',
      clearable: true,
      options: STATUS_OPTIONS
    }
  }
])

const buildOrder = (params: AdBannerSearchParams) => {
  const sort = String(params.sort || '').trim()
  const direction = String(params.order || '').toLowerCase()
  if (sort && direction === 'ascending') return `${sort} ASC`
  if (sort && direction === 'descending') return `${sort} DESC`
  return params.order || 'sort ASC, created_at DESC'
}

const buildListParams = (params: AdBannerSearchParams = {}): AdBannerListParams => {
  const apiParams: AdBannerListParams = {
    ...createPageParams(params),
    order: buildOrder(params)
  }

  if (hasSearchValue(params.title)) apiParams.title = String(params.title).trim()
  if (hasSearchValue(params.keyword)) apiParams.keyword = String(params.keyword).trim()
  if (hasSearchValue(params.status)) apiParams.status = Number(params.status)

  return apiParams
}

const fetchData = async (params: AdBannerSearchParams = {}) => {
  try {
    const res = await getAdBannerList(buildListParams(params))
    const data = res.data || { list: [], pager: undefined }
    return {
      list: data.list || [],
      total: data.pager?.total || 0
    }
  } catch (error) {
    handleErrorMessage(error, '获取广告横幅列表失败')
    return { list: [], total: 0 }
  }
}

const resetForm = (row?: AdBannerItem) => {
  Object.assign(formData, {
    id: row?.id,
    image_url: row?.image_url || '',
    link_url: row?.link_url || '',
    sort: normalizeNumber(row?.sort, DEFAULT_FORM.sort),
    status: normalizeStatus(row?.status),
    title: row?.title || ''
  })
}

const openFormDialog = () => {
  formDialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

const handleAdd = () => {
  dialogMode.value = 'add'
  resetForm()
  openFormDialog()
}

const handleEdit = (row: AdBannerItem) => {
  dialogMode.value = 'edit'
  resetForm(row)
  openFormDialog()
}

const reloadTable = () => searchTableRef.value?.reload()

const buildSavePayload = (): SaveAdBannerParams => ({
  id: formData.id,
  image_url: formData.image_url.trim(),
  link_url: formData.link_url.trim(),
  sort: normalizeNumber(formData.sort),
  status: normalizeStatus(formData.status),
  title: formData.title.trim()
})

const buildRowPayload = (row: AdBannerItem, status = normalizeStatus(row.status)) => ({
  id: row.id,
  image_url: String(row.image_url || '').trim(),
  link_url: String(row.link_url || '').trim(),
  sort: normalizeNumber(row.sort),
  status,
  title: String(row.title || '').trim()
})

const submitForm = async () => {
  if (submitting.value || uploading.value) return

  try {
    await formRef.value?.validate()
    submitting.value = true
    const payload = buildSavePayload()
    if (dialogMode.value === 'edit') {
      await updateAdBanner(payload)
    } else {
      await createAdBanner(payload)
    }

    formDialogVisible.value = false
    await reloadTable()
    handleSuccessMessage(dialogMode.value === 'edit' ? '编辑成功' : '新增成功')
  } catch (error) {
    if (error !== false) {
      handleErrorMessage(
        error,
        dialogMode.value === 'edit' ? '编辑广告横幅失败' : '新增广告横幅失败'
      )
    }
  } finally {
    submitting.value = false
  }
}

const handleStatusChange = async (row: AdBannerItem, value: boolean | number | string) => {
  const nextStatus = Number(value) === 1 || value === true ? 1 : 2
  const previousStatus = row.status
  row.status = nextStatus

  try {
    await updateAdBanner(buildRowPayload(row, nextStatus))
    handleSuccessMessage(nextStatus === 1 ? '启用成功' : '停用成功')
  } catch (error) {
    row.status = previousStatus
    handleErrorMessage(error, '状态更新失败')
  }
}

const handleDelete = async (row: AdBannerItem) => {
  try {
    await ElMessageBox.confirm(`确认要删除广告“${row.title}”吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteAdBanner(row.id)
    await reloadTable()
    handleSuccessMessage('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      handleErrorMessage(error, '删除广告横幅失败')
    }
  }
}

const handleImageChange = async (uploadFile: UploadFile) => {
  const rawFile = uploadFile.raw
  if (!rawFile) return

  try {
    if (!(await hasSupportedImageSignature(rawFile))) {
      handleWarningMessage(IMAGE_FORMAT_MESSAGE)
      return
    }
  } catch {
    handleWarningMessage('无法读取图片文件，请重新选择')
    return
  }

  try {
    await getImageDimensions(rawFile)
  } catch {
    handleWarningMessage('图片文件无效，无法读取图片尺寸')
    return
  }

  await openCropDialog(rawFile)
}

const confirmCrop = async () => {
  if (uploading.value) return

  uploading.value = true
  try {
    const croppedFile = await createCroppedFile()
    if (croppedFile.size > IMAGE_MAX_SIZE) {
      handleWarningMessage('裁剪后的图片大小仍超过 2MB，请缩小裁剪区域或更换图片')
      return
    }

    const uploadData = new FormData()
    uploadData.append('file', croppedFile)
    const res = await uploadImageFile(uploadData)
    const imageUrl = normalizeUploadedImageUrl(res.data?.url, res.data?.filename)
    if (!imageUrl) {
      throw new Error('上传接口未返回有效的图片地址或文件名')
    }

    formData.image_url = imageUrl
    await nextTick()
    formRef.value?.clearValidate('image_url')
    handleSuccessMessage('图片裁剪并上传成功')
    closeCropDialog()
  } catch (error) {
    handleErrorMessage(error, '图片裁剪或上传失败')
  } finally {
    uploading.value = false
  }
}

const cancelCrop = () => {
  if (!uploading.value) {
    closeCropDialog()
  }
}
</script>

<style scoped>
.image-form-field {
  width: 100%;
}

.image-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.image-input-row :deep(.el-upload) {
  display: inline-flex;
}

.form-image-preview {
  display: block;
  width: 220px;
  height: 90px;
  margin-top: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.field-tip {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.image-error-placeholder {
  display: flex;
  width: 100%;
  min-height: 32px;
  padding: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
  background: var(--el-fill-color-light);
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
}

.table-image-preview {
  width: 80px;
  height: 44px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.ad-image-empty {
  color: var(--el-text-color-secondary);
}

.ad-action-buttons {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
}

.ad-action-buttons :deep(.el-button + .el-button) {
  margin-left: 0;
}

.cropper-container {
  width: 100%;
  height: 420px;
  overflow: hidden;
  background: var(--el-fill-color-light);
}

.cropper-image {
  display: block;
  max-width: 100%;
}

.cropper-tip {
  margin-top: 12px;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}
</style>
