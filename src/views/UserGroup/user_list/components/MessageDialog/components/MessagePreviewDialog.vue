<template>
  <Dialog v-model="visible" title="消息预览" width="650px">
    <div class="message-preview-wrapper">
      <!-- 机器人信息 -->
      <div
        v-if="previewData.botName || (previewData.botNames && previewData.botNames.length > 0)"
        class="preview-info-item"
      >
        <div class="info-label">发送机器人</div>
        <div v-if="previewData.botNames && previewData.botNames.length > 0" class="info-value">
          <div v-for="(name, index) in previewData.botNames" :key="index" class="bot-name-tag">
            {{ name }}
          </div>
        </div>
        <div v-else class="info-value">{{ previewData.botName }}</div>
      </div>

      <!-- 接收用户信息 -->
      <div v-if="previewData.recipientInfo" class="preview-info-item">
        <div class="info-label">接收用户</div>
        <div class="info-value">{{ previewData.recipientInfo }}</div>
      </div>

      <!-- 群组/频道信息 -->
      <div v-if="previewData.groupInfo" class="preview-info-item">
        <div class="info-label">发送对象</div>
        <div class="info-value">{{ previewData.groupInfo }}</div>
      </div>

      <!-- Telegram 风格消息预览 -->
      <div class="telegram-preview-section">
        <div class="section-label">消息预览：</div>
        <div class="telegram-message-container">
          <!-- 如果有文件，遍历显示 -->
          <template v-if="previewData.files && previewData.files.length > 0">
            <div
              v-for="(file, index) in previewData.files"
              :key="`file-${index}`"
              class="telegram-message-card"
            >
              <!-- 图片/视频 -->
              <div class="telegram-media-container">
                <template v-if="file.type === 'video'">
                  <video
                    :src="file.url"
                    class="telegram-media-content"
                    muted
                    preload="metadata"
                    disablePictureInPicture
                    controlslist="nodownload noremoteplayback"
                  ></video>
                  <div class="telegram-video-icon">▶</div>
                </template>
                <template v-else>
                  <img :src="file.url" class="telegram-media-content" alt="图片" />
                </template>
              </div>

              <!-- 只在最后一个文件上显示文字内容和内联按钮 -->
              <template v-if="index === previewData.files.length - 1">
                <!-- 文字内容 -->
                <div v-if="previewData.content" class="telegram-message-text">
                  {{ previewData.content }}
                </div>

                <!-- 内联按钮预览 -->
                <div v-if="buttonRows.length > 0" class="telegram-inline-buttons">
                  <div
                    v-for="(row, rowIndex) in buttonRows"
                    :key="rowIndex"
                    class="telegram-inline-button-row"
                  >
                    <div
                      v-for="(button, btnIndex) in row"
                      :key="btnIndex"
                      class="telegram-inline-button"
                    >
                      {{ button.text }}
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </template>

          <!-- 如果没有文件，只显示文字和按钮 -->
          <template v-else>
            <div class="telegram-message-card text-only">
              <!-- 文字内容 -->
              <div v-if="previewData.content" class="telegram-message-text">
                {{ previewData.content }}
              </div>
              <div v-else class="telegram-message-text empty">无文字内容</div>

              <!-- 内联按钮预览 -->
              <div v-if="buttonRows.length > 0" class="telegram-inline-buttons">
                <div
                  v-for="(row, rowIndex) in buttonRows"
                  :key="rowIndex"
                  class="telegram-inline-button-row"
                >
                  <div
                    v-for="(button, btnIndex) in row"
                    :key="btnIndex"
                    class="telegram-inline-button"
                  >
                    {{ button.text }}
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 内联按钮行布局编辑器 -->
      <div
        v-if="previewData.buttons && previewData.buttons.length > 0"
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
              <!-- 从未分配池添加按钮到此行（最多3个） -->
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

          <!-- 未分配的按钮 -->
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
        <ElButton type="primary" :loading="submitting" @click="handleConfirm"> 确认发送 </ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElButton, ElTag, ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus'
import { Dialog } from '@/components/Dialog'

export interface ButtonItem {
  id: number
  text: string
  url?: string
}

export interface MessagePreviewData {
  botName?: string
  botNames?: string[] // 多个机器人名称数组
  recipientInfo?: string
  groupInfo?: string // 群组信息
  content?: string
  files?: Array<{ type: 'image' | 'video'; url: string; name: string }>
  buttons?: ButtonItem[] // 选中的按钮列表（带 id）
  buttonRows?: Array<Array<{ text: string; url?: string }>> // 兼容旧用法
}

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  previewData: {
    type: Object as () => MessagePreviewData,
    default: () => ({})
  },
  submitting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 内部行布局数据: number[][] (按钮ID的二维数组)
const rowLayout = ref<number[][]>([])

// 当弹窗打开时，初始化布局（默认每行3个）
watch(
  () => visible.value,
  (val) => {
    if (val && props.previewData.buttons && props.previewData.buttons.length > 0) {
      // 按每行3个分组
      const ids = props.previewData.buttons.map((btn) => btn.id)
      const rows: number[][] = []
      for (let i = 0; i < ids.length; i += 3) {
        rows.push(ids.slice(i, i + 3))
      }
      rowLayout.value = rows
    } else if (!val) {
      rowLayout.value = []
    }
  }
)

// 所有可用按钮的 map
const buttonMap = computed(() => {
  const map = new Map<number, ButtonItem>()
  if (props.previewData.buttons) {
    props.previewData.buttons.forEach((btn) => map.set(btn.id, btn))
  }
  return map
})

// 已分配的按钮 ID 集合
const assignedIds = computed(() => {
  const ids = new Set<number>()
  rowLayout.value.forEach((row) => row.forEach((id) => ids.add(id)))
  return ids
})

// 未分配的按钮
const unassignedButtons = computed(() => {
  if (!props.previewData.buttons) return []
  return props.previewData.buttons.filter((btn) => !assignedIds.value.has(btn.id))
})

// 渲染用的行数据（带文本）
const buttonRows = computed(() => {
  return rowLayout.value
    .filter((row) => Array.isArray(row))
    .map(
      (row) =>
        row.map((id) => buttonMap.value.get(id)).filter((btn) => btn !== undefined) as ButtonItem[]
    )
    .filter((row) => row.length > 0)
})

// 添加按钮到指定行
const addButtonToRow = (rowIndex: number, id: number) => {
  if (rowLayout.value[rowIndex]) {
    rowLayout.value[rowIndex].push(id)
  }
}

// 添加按钮到新的一行
const addButtonToLastRow = (id: number) => {
  rowLayout.value.push([id])
}

// 从行中移除按钮（放回未分配池）
const moveButtonOut = (rowIndex: number, colIndex: number) => {
  rowLayout.value[rowIndex].splice(colIndex, 1)
  if (rowLayout.value[rowIndex].length === 0) {
    rowLayout.value.splice(rowIndex, 1)
  }
}

// 删除整行
const removeRow = (rowIndex: number) => {
  rowLayout.value.splice(rowIndex, 1)
}

// 获取最终的二维数组布局
const getFinalLayout = (): number[][] => {
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

/* 信息项样式 */
.preview-info-item {
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.info-label {
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

/* Telegram 预览区域 */
.telegram-preview-section {
  margin-top: 24px;
}

.section-label {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

/* Telegram 消息容器 */
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
  max-width: 100%;
  margin-bottom: 8px;
  overflow: hidden;
  background: #dcf8c6;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 10%);
  align-self: center;
}

.telegram-message-card.text-only {
  width: 100%;
  max-width: 100%;
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

.telegram-message-text.empty {
  font-style: italic;
  color: #909399;
}

.telegram-inline-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px 8px;
}

.telegram-inline-button-row {
  display: flex;
  gap: 4px;
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
  transition: background-color 0.2s;
}

.telegram-inline-button:hover {
  background: #f5f5f5;
}

/* 按钮布局编辑区 */
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

.layout-row {
  display: flex;
  align-items: center;
  gap: 8px;
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
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
  align-items: center;
}

.add-btn {
  font-size: 16px;
  font-weight: bold;
}

.unassigned-pool {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
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
  transition: all 0.2s;
}

.unassigned-tag:hover {
  transform: scale(1.05);
}

.add-icon {
  margin-left: 4px;
  font-weight: bold;
}

/* 底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
