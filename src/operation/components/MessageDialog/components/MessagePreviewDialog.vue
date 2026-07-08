<template>
  <Dialog v-model="visible" :title="title" width="650px">
    <div class="message-preview-wrapper">
      <div v-if="botNames.length > 0" class="preview-info-item">
        <div class="info-label">发送机器人</div>
        <div class="info-value">
          <span v-for="name in botNames" :key="name" class="bot-name-tag">{{ name }}</span>
        </div>
      </div>

      <div v-if="previewData.recipientInfo" class="preview-info-item">
        <div class="info-label">接收用户</div>
        <div class="info-value">{{ previewData.recipientInfo }}</div>
      </div>

      <div v-if="previewData.groupInfo" class="preview-info-item">
        <div class="info-label">发送对象</div>
        <div class="info-value">{{ previewData.groupInfo }}</div>
      </div>

      <div class="telegram-preview-section">
        <div class="section-label">消息预览：</div>
        <div class="telegram-message-container">
          <template v-if="previewData.files && previewData.files.length > 0">
            <div
              v-for="(file, index) in previewData.files"
              :key="`${file.url}-${index}`"
              class="telegram-message-card"
            >
              <div class="telegram-media-container">
                <template v-if="file.type === 'video'">
                  <VideoPoster :src="file.url" class="telegram-media-content" alt="视频封面" />
                </template>
                <img v-else :src="file.url" class="telegram-media-content" alt="图片" />
              </div>

              <template v-if="index === previewData.files.length - 1">
                <div
                  v-if="normalizedHtmlContent"
                  class="telegram-message-text"
                  v-html="normalizedHtmlContent"
                ></div>
                <div v-if="buttonRows.length > 0" class="telegram-inline-buttons">
                  <div
                    v-for="(row, rowIndex) in buttonRows"
                    :key="rowIndex"
                    class="telegram-inline-button-row"
                  >
                    <div v-for="button in row" :key="button.id" class="telegram-inline-button">
                      {{ button.text }}
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </template>

          <template v-else>
            <div class="telegram-message-card text-only">
              <div
                v-if="normalizedHtmlContent"
                class="telegram-message-text"
                v-html="normalizedHtmlContent"
              ></div>
              <div v-else class="telegram-message-text empty">无文字内容</div>

              <div v-if="buttonRows.length > 0" class="telegram-inline-buttons">
                <div
                  v-for="(row, rowIndex) in buttonRows"
                  :key="rowIndex"
                  class="telegram-inline-button-row"
                >
                  <div v-for="button in row" :key="button.id" class="telegram-inline-button">
                    {{ button.text }}
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div
        v-if="!readonly && previewData.buttons && previewData.buttons.length > 0"
        class="button-layout-section"
      >
        <div class="section-label">内联按钮布局调整：</div>
        <div class="layout-editor">
          <div v-for="(row, rowIndex) in buttonRows" :key="rowIndex" class="layout-row">
            <span class="row-index">第{{ rowIndex + 1 }}行</span>
            <div class="row-tags">
              <ElTag
                v-for="(btn, colIndex) in row"
                :key="btn.id"
                closable
                type="primary"
                effect="dark"
                size="default"
                @close="moveButtonOut(rowIndex, colIndex)"
              >
                {{ btn.text }}
              </ElTag>
              <ElDropdown
                v-if="unassignedButtons.length > 0 && row.length < 3"
                trigger="click"
                @command="(id: number) => addButtonToRow(rowIndex, id)"
              >
                <ElButton link type="primary" size="small" class="add-btn">+</ElButton>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem
                      v-for="btn in unassignedButtons"
                      :key="btn.id"
                      :command="btn.id"
                    >
                      {{ btn.text }}
                    </ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </div>
            <ElButton link type="danger" size="small" @click="removeRow(rowIndex)">删除行</ElButton>
          </div>

          <div v-if="unassignedButtons.length > 0" class="unassigned-pool">
            <span class="pool-label">未分配：</span>
            <ElTag
              v-for="btn in unassignedButtons"
              :key="btn.id"
              type="warning"
              effect="plain"
              class="unassigned-tag"
              @click="addButtonToLastRow(btn.id)"
            >
              {{ btn.text }} <span class="add-icon">+</span>
            </ElTag>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="handleCancel">取消</ElButton>
        <ElButton v-if="readonly" type="primary" @click="visible = false">关闭</ElButton>
        <ElButton v-else type="primary" :loading="submitting" @click="handleConfirm">
          确认
        </ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElDropdown, ElDropdownItem, ElDropdownMenu, ElTag } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { normalizeReplyContentHtml } from '@/utils/replyContent'
import VideoPoster from '@/components/business/message/MessageDialog/components/VideoPoster.vue'

export interface ButtonItem {
  id: number
  text: string
  url?: string
}

export interface MessagePreviewFile {
  type: 'image' | 'video'
  url: string
  name: string
}

export interface MessagePreviewData {
  botName?: string
  botNames?: string[]
  recipientInfo?: string
  groupInfo?: string
  content?: string
  htmlContent?: string
  files?: MessagePreviewFile[]
  buttons?: ButtonItem[]
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    previewData?: MessagePreviewData
    submitting?: boolean
    readonly?: boolean
    title?: string
  }>(),
  {
    previewData: () => ({}),
    submitting: false,
    readonly: false,
    title: '消息预览'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', value: number[][]): void
  (e: 'cancel'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const rowLayout = ref<number[][]>([])

const botNames = computed(() => {
  if (props.previewData.botNames?.length) return props.previewData.botNames
  return props.previewData.botName ? [props.previewData.botName] : []
})

watch(
  () => visible.value,
  (val) => {
    if (val && props.previewData.buttons?.length) {
      const ids = props.previewData.buttons.map((btn) => btn.id)
      const rows: number[][] = []
      for (let i = 0; i < ids.length; i += 3) {
        rows.push(ids.slice(i, i + 3))
      }
      rowLayout.value = rows
      return
    }

    if (!val) {
      rowLayout.value = []
    }
  }
)

const buttonMap = computed(() => {
  const map = new Map<number, ButtonItem>()
  props.previewData.buttons?.forEach((btn) => map.set(btn.id, btn))
  return map
})

const normalizedHtmlContent = computed(() =>
  normalizeReplyContentHtml(props.previewData.htmlContent ?? props.previewData.content)
)

const assignedIds = computed(() => {
  const ids = new Set<number>()
  rowLayout.value.forEach((row) => row.forEach((id) => ids.add(id)))
  return ids
})

const unassignedButtons = computed(() => {
  return props.previewData.buttons?.filter((btn) => !assignedIds.value.has(btn.id)) || []
})

const buttonRows = computed(() => {
  return rowLayout.value
    .filter((row) => Array.isArray(row))
    .map(
      (row) =>
        row.map((id) => buttonMap.value.get(id)).filter((btn) => btn !== undefined) as ButtonItem[]
    )
    .filter((row) => row.length > 0)
})

const addButtonToRow = (rowIndex: number, id: number) => {
  rowLayout.value[rowIndex]?.push(id)
}

const addButtonToLastRow = (id: number) => {
  rowLayout.value.push([id])
}

const moveButtonOut = (rowIndex: number, colIndex: number) => {
  rowLayout.value[rowIndex]?.splice(colIndex, 1)
  if (rowLayout.value[rowIndex]?.length === 0) {
    rowLayout.value.splice(rowIndex, 1)
  }
}

const removeRow = (rowIndex: number) => {
  rowLayout.value.splice(rowIndex, 1)
}

const getFinalLayout = () => {
  return rowLayout.value.filter((row) => Array.isArray(row) && row.length > 0)
}

const handleConfirm = () => {
  emit('confirm', getFinalLayout())
}

const handleCancel = () => {
  emit('cancel')
  visible.value = false
}
</script>

<style scoped>
.message-preview-wrapper {
  padding: 8px 4px;
}

:deep(.el-dialog__body) {
  max-height: 65vh;
  overflow: hidden auto;
}

.preview-info-item {
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.info-label,
.section-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.info-value {
  font-size: 14px;
  color: #303133;
}

.bot-name-tag {
  display: inline-block;
  padding: 4px 12px;
  margin-right: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #409eff;
  background: #ecf5ff;
  border-radius: 4px;
}

.telegram-preview-section {
  margin-top: 24px;
}

.telegram-message-container {
  display: flex;
  min-height: 200px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
}

.telegram-message-card {
  position: relative;
  width: 100%;
  margin-bottom: 8px;
  overflow: hidden;
  background: #dcf8c6;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 10%);
  align-self: center;
}

.telegram-media-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #000;
  border-radius: 8px 8px 0 0;
}

.telegram-media-content {
  display: block;
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: cover;
}

.telegram-video-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 40px;
  color: white;
  text-shadow: 0 0 8px rgb(0 0 0 / 80%);
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.telegram-message-text {
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #000;
  word-break: break-word;
  white-space: pre-wrap;
}

.telegram-message-text :deep(b),
.telegram-message-text :deep(strong) {
  font-weight: 700;
}

.telegram-message-text :deep(i),
.telegram-message-text :deep(em) {
  font-style: italic;
}

.telegram-message-text :deep(u) {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.telegram-message-text :deep(a) {
  color: #08c;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.telegram-message-text :deep(pre) {
  padding: 8px 10px;
  margin: 8px 0;
  overflow: auto hidden;
  font-family: Consolas, Monaco, monospace;
  white-space: pre-wrap;
  background: rgb(255 255 255 / 65%);
  border-radius: 6px;
}

.telegram-message-text :deep(code) {
  font-family: Consolas, Monaco, monospace;
  word-break: break-word;
  white-space: pre-wrap;
}

.telegram-message-text :deep(p) {
  margin: 0 0 8px;
}

.telegram-message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.telegram-message-text.empty {
  font-style: italic;
  color: #909399;
}

.telegram-inline-buttons,
.telegram-inline-button-row {
  display: flex;
  gap: 4px;
}

.telegram-inline-buttons {
  padding: 0 8px 8px;
  flex-direction: column;
}

.telegram-inline-button {
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #08c;
  text-align: center;
  cursor: default;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.button-layout-section {
  padding-top: 16px;
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
}

.layout-editor {
  padding: 12px;
  background: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.layout-row,
.row-tags,
.unassigned-pool,
.dialog-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.layout-row {
  padding: 6px 8px;
  margin-bottom: 6px;
  background: #fff;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
}

.row-index {
  min-width: 42px;
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.row-tags {
  flex: 1;
  flex-wrap: wrap;
}

.add-btn {
  font-size: 16px;
  font-weight: bold;
}

.unassigned-pool {
  flex-wrap: wrap;
  padding: 8px;
  margin-top: 8px;
  background: #fff8e6;
  border: 1px dashed #e6a23c;
  border-radius: 4px;
}

.pool-label {
  font-size: 12px;
  color: #e6a23c;
  white-space: nowrap;
}

.unassigned-tag {
  cursor: pointer;
}

.add-icon {
  margin-left: 4px;
  font-weight: bold;
}

.dialog-footer {
  justify-content: flex-end;
  gap: 12px;
}
</style>
