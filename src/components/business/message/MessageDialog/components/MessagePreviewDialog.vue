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
          <!-- 选择区：仅展示用户主动移出的按钮，可拖回编排区；未移出的默认已全部分配位置 -->
          <div
            class="arrange-pool"
            :class="{ 'is-drop-target': isDragging && draggingFrom === 'layout' }"
            @dragover.prevent
            @dragenter.prevent="onDragEnterPool"
            @drop.prevent="onDropToPool"
          >
            <p class="arrange-pool-tip">选择区：点击补位 / 拖入编排，拖回可移出</p>
            <div class="arrange-pool-chips">
              <div
                v-for="btn in unassignedButtons"
                :key="btn.id"
                class="arrange-btn-chip arrange-btn-chip--available"
                :class="{ 'is-dragging': draggingId === btn.id }"
                draggable="true"
                @click="addButtonToArrangement(btn.id)"
                @dragstart="onDragStart(btn.id, 'pool')"
                @dragend="onDragEnd"
              >
                {{ btn.text }} <span class="arrange-btn-add-icon">＋</span>
              </div>
              <span v-if="unassignedButtons.length === 0" class="arrange-pool-empty">
                {{ isDragging && draggingFrom === 'layout' ? '松开以移出' : '已全部放入编排区' }}
              </span>
            </div>
          </div>

          <div class="arrange-editor">
            <p class="arrange-preview-tip">
              编排区：拖拽排序（最多 {{ MAX_ROWS }} 行 × 每行 {{ MAX_PER_ROW }} 个），空行提交时忽略
            </p>

            <div v-if="rowLayout.length === 0" class="arrange-preview-empty">
              <p class="arrange-preview-empty__text">暂无布局</p>
              <ElButton
                v-if="previewData.buttons && previewData.buttons.length > 0"
                type="primary"
                plain
                @click="randomArrangeButtons"
              >
                随机编排
              </ElButton>
            </div>

            <div v-for="(row, rowIdx) in rowLayout" :key="rowIdx" class="arrange-row-wrapper">
              <div class="arrange-row-header">
                <span class="arrange-row-label">
                  第 {{ rowIdx + 1 }} 行（{{ row.length }} 个按钮）
                </span>
                <ElButton link type="danger" size="small" @click="removeRow(rowIdx)">
                  删除行
                </ElButton>
              </div>
              <div
                class="arrange-preview-row"
                :class="{ 'is-drop-target': isDragging && draggingFrom === 'pool' }"
                @dragover.prevent
                @dragenter.self="onDragEnterRow(rowIdx)"
                @drop.prevent="onDropToRow(rowIdx)"
              >
                <div
                  v-for="btnId in row"
                  :key="btnId"
                  class="arrange-btn-chip"
                  :class="{ 'is-dragging': draggingId === btnId }"
                  draggable="true"
                  @dragstart="onDragStart(btnId, 'layout')"
                  @dragover.prevent
                  @dragenter="onDragEnterChip(btnId)"
                  @dragend="onDragEnd"
                >
                  {{ getBtnText(btnId) }}
                  <span class="arrange-btn-remove" @click.stop="removeButtonFromArrangement(btnId)"
                    >✕</span
                  >
                </div>
                <span v-if="row.length === 0" class="arrange-row-drop-hint">将按钮拖入此行</span>
              </div>
            </div>

            <ElButton
              class="arrange-add-row-btn"
              plain
              :disabled="rowLayout.length >= MAX_ROWS"
              @click="addRow"
            >
              + 新增一行
            </ElButton>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="handleCancel">取消</ElButton>
        <ElButton v-if="readonly" type="primary" @click="visible = false">关闭</ElButton>
        <ElButton v-else type="primary" :loading="submitting" @click="handleConfirm">
          {{ confirmButtonText }}
        </ElButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import { normalizeReplyContentHtml } from '@/utils/replyContent'
import VideoPoster from '@/components/business/message/MessageDialog/components/VideoPoster.vue'

/** 内联按钮布局：最多 10 行，每行最多 3 个 */
const MAX_ROWS = 10
const MAX_PER_ROW = 3

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
    /** 确认按钮文案，代理端发送场景可用「确认发送」 */
    confirmButtonText?: string
  }>(),
  {
    previewData: () => ({}),
    submitting: false,
    readonly: false,
    title: '消息预览',
    confirmButtonText: '确认'
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
const draggingId = ref<number | null>(null)
/** 拖拽来源：选择区 pool / 编排区 layout */
const draggingFrom = ref<'pool' | 'layout' | null>(null)
const isDragging = computed(() => draggingId.value !== null)

const botNames = computed(() => {
  if (props.previewData.botNames?.length) return props.previewData.botNames
  return props.previewData.botName ? [props.previewData.botName] : []
})

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

const getBtnText = (id: number) => buttonMap.value.get(id)?.text ?? `#${id}`

/**
 * 按顺序将 id 列表打包为行（每行最多 MAX_PER_ROW，总行数不超过 MAX_ROWS）
 */
const packIdsToRows = (ids: number[], maxRows = MAX_ROWS): { rows: number[][]; failed: number } => {
  const rows: number[][] = []
  let failed = 0
  for (let i = 0; i < ids.length; i += MAX_PER_ROW) {
    if (rows.length >= maxRows) {
      failed = ids.length - i
      break
    }
    rows.push(ids.slice(i, i + MAX_PER_ROW))
  }
  return { rows, failed }
}

/**
 * 将未放入的按钮写入编排区。
 * - fillGaps: true 时先补满已有行空缺，再新开行（点击添加用）
 * - fillGaps: false 时只在末尾新开行（确认提交兜底用，避免打乱已排好的行）
 */
const autoPlaceUnassignedButtons = (options?: {
  silent?: boolean
  onlyIds?: number[]
  fillGaps?: boolean
}) => {
  const silent = options?.silent !== false
  const fillGaps = options?.fillGaps === true
  const onlyIds = options?.onlyIds
  const newRows = rowLayout.value.map((row) => [...row])
  const placed = new Set(newRows.flat())

  const selectedOrder = (props.previewData.buttons || []).map((btn) => btn.id)
  const candidates = (onlyIds ? onlyIds : selectedOrder).filter((id) => !placed.has(id))

  const uniqueCandidates: number[] = []
  const seen = new Set<number>()
  for (const id of candidates) {
    if (seen.has(id) || placed.has(id)) continue
    seen.add(id)
    uniqueCandidates.push(id)
  }

  if (uniqueCandidates.length === 0) return 0

  const remaining: number[] = []
  for (const id of uniqueCandidates) {
    if (fillGaps) {
      const gapIdx = newRows.findIndex((row) => row.length < MAX_PER_ROW)
      if (gapIdx !== -1) {
        newRows[gapIdx].push(id)
        continue
      }
    }
    remaining.push(id)
  }

  const remainRows = Math.max(0, MAX_ROWS - newRows.length)
  const { rows: extraRows, failed } = packIdsToRows(remaining, remainRows)
  rowLayout.value = [...newRows, ...extraRows]

  if (failed > 0 && !silent) {
    ElMessage.warning(`最多 ${MAX_ROWS} 行 × 每行 ${MAX_PER_ROW} 个，仍有 ${failed} 个无法放入`)
  }
  return failed
}

/** 打开预览时：选中的按钮按顺序全部自动分配到编排区（每行 3 个） */
const initLayoutFromButtons = () => {
  const ids = props.previewData.buttons?.map((btn) => btn.id) || []
  if (ids.length === 0) {
    rowLayout.value = []
    return
  }
  const { rows, failed } = packIdsToRows(ids, MAX_ROWS)
  rowLayout.value = rows
  if (failed > 0) {
    ElMessage.warning(
      `最多 ${MAX_ROWS} 行、每行 ${MAX_PER_ROW} 个，有 ${failed} 个按钮未放入，可拖到选择区后调整`
    )
  }
}

watch(
  () => visible.value,
  (val) => {
    if (val && props.previewData.buttons?.length) {
      // 打开即按选择顺序完整分配，不留未分配按钮
      initLayoutFromButtons()
      return
    }
    if (!val) {
      rowLayout.value = []
      draggingId.value = null
      draggingFrom.value = null
    }
  }
)

// 按钮列表变化且弹窗已打开：仅在当前无布局时重新完整分配（不自动往已有行塞按钮）
watch(
  () => props.previewData.buttons?.map((b) => b.id).join(',') ?? '',
  () => {
    if (!visible.value || !props.previewData.buttons?.length) return
    if (rowLayout.value.flat().length === 0) {
      initLayoutFromButtons()
    }
  }
)

const findButtonRowIndex = (id: number, rows: number[][]) => {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].includes(id)) return i
  }
  return -1
}

const addButtonToArrangement = (id: number) => {
  if (assignedIds.value.has(id)) return
  // 点击添加：优先补满已有行空缺，满了再新开行（不单独为 1 个按钮乱开行，除非没有空位）
  autoPlaceUnassignedButtons({ silent: false, onlyIds: [id], fillGaps: true })
}

const removeButtonFromArrangement = (id: number) => {
  // 仅移出按钮，空行保留（只有「删除行」才删行）
  rowLayout.value = rowLayout.value.map((row) => row.filter((btnId) => btnId !== id))
}

const addRow = () => {
  if (rowLayout.value.length >= MAX_ROWS) {
    ElMessage.warning(`最多只能添加 ${MAX_ROWS} 行`)
    return
  }
  rowLayout.value = [...rowLayout.value, []]
}

const removeRow = (idx: number) => {
  // 删除行：行内按钮回到选择区；全部删完后不自动回填，展示「随机编排」按钮
  const newRows = rowLayout.value.map((row) => [...row])
  newRows.splice(idx, 1)
  rowLayout.value = newRows
}

/** 随机打乱选中按钮并按每行最多 3 个重新分配到编排区 */
const randomArrangeButtons = () => {
  const ids = props.previewData.buttons?.map((btn) => btn.id) || []
  if (ids.length === 0) {
    ElMessage.warning('暂无按钮可编排')
    return
  }
  // Fisher–Yates 洗牌
  const shuffled = [...ids]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const { rows, failed } = packIdsToRows(shuffled, MAX_ROWS)
  rowLayout.value = rows
  if (failed > 0) {
    ElMessage.warning(`最多 ${MAX_ROWS} 行 × 每行 ${MAX_PER_ROW} 个，有 ${failed} 个未放入`)
  }
}

const onDragStart = (id: number, from: 'pool' | 'layout') => {
  draggingId.value = id
  draggingFrom.value = from
}

/** 从选择区拖到编排区某行，或编排区内跨行移动 */
const placeButtonInRow = (dragId: number, rowIdx: number, insertAt?: number) => {
  const newRows = rowLayout.value.map((row) => [...row])
  if (!newRows[rowIdx]) return false

  const sourceRowIdx = findButtonRowIndex(dragId, newRows)
  const alreadyInTarget = newRows[rowIdx].includes(dragId)

  // 目标行已满且不是在本行内重排
  if (!alreadyInTarget && newRows[rowIdx].length >= MAX_PER_ROW) {
    return false
  }

  if (sourceRowIdx !== -1) {
    const col = newRows[sourceRowIdx].indexOf(dragId)
    newRows[sourceRowIdx].splice(col, 1)
    // 同源行且源下标在插入点前，插入下标左移
    if (sourceRowIdx === rowIdx && insertAt !== undefined && col < insertAt) {
      insertAt -= 1
    }
  }

  if (insertAt === undefined || insertAt < 0 || insertAt > newRows[rowIdx].length) {
    newRows[rowIdx].push(dragId)
  } else {
    newRows[rowIdx].splice(insertAt, 0, dragId)
  }

  rowLayout.value = newRows
  draggingFrom.value = 'layout'
  return true
}

const onDragEnterChip = (targetId: number) => {
  if (draggingId.value === null || draggingId.value === targetId) return
  const dragId = draggingId.value
  const newRows = rowLayout.value.map((row) => [...row])

  let sourceRowIdx = -1
  let sourceColIdx = -1
  let targetRowIdx = -1
  let targetColIdx = -1

  newRows.forEach((row, rIdx) => {
    const s = row.indexOf(dragId)
    if (s !== -1) {
      sourceRowIdx = rIdx
      sourceColIdx = s
    }
    const t = row.indexOf(targetId)
    if (t !== -1) {
      targetRowIdx = rIdx
      targetColIdx = t
    }
  })

  if (targetRowIdx === -1) return

  // 从选择区拖入编排区：插到目标按钮前
  if (sourceRowIdx === -1) {
    if (newRows[targetRowIdx].length >= MAX_PER_ROW) return
    placeButtonInRow(dragId, targetRowIdx, targetColIdx)
    return
  }

  // 跨行且目标行已满 3 个，不允许拖入
  if (sourceRowIdx !== targetRowIdx && newRows[targetRowIdx].length >= MAX_PER_ROW) {
    return
  }

  newRows[sourceRowIdx].splice(sourceColIdx, 1)
  const insertIdx =
    sourceRowIdx === targetRowIdx && sourceColIdx < targetColIdx ? targetColIdx - 1 : targetColIdx
  newRows[targetRowIdx].splice(insertIdx, 0, dragId)
  rowLayout.value = newRows
}

const onDragEnterRow = (rowIdx: number) => {
  if (draggingId.value === null) return
  const dragId = draggingId.value
  const targetRow = rowLayout.value[rowIdx]
  if (!targetRow) return
  if (targetRow[targetRow.length - 1] === dragId) return

  const alreadyInRow = targetRow.includes(dragId)
  if (!alreadyInRow && targetRow.length >= MAX_PER_ROW) return

  placeButtonInRow(dragId, rowIdx)
}

const onDropToRow = (rowIdx: number) => {
  if (draggingId.value === null) return
  onDragEnterRow(rowIdx)
}

/** 拖回选择区：移出布局 */
const onDragEnterPool = () => {
  if (draggingId.value === null || draggingFrom.value !== 'layout') return
  removeButtonFromArrangement(draggingId.value)
  draggingFrom.value = 'pool'
}

const onDropToPool = () => {
  if (draggingId.value === null) return
  if (assignedIds.value.has(draggingId.value)) {
    removeButtonFromArrangement(draggingId.value)
  }
  draggingFrom.value = 'pool'
}

const onDragEnd = () => {
  // 拖拽结束不清理空行，空行仅通过「删除行」移除
  draggingId.value = null
  draggingFrom.value = null
}

/** 提交时：未放入的先补满空缺再末尾新开行，最后过滤空行 */
const getFinalLayout = () => {
  autoPlaceUnassignedButtons({ silent: false, fillGaps: true })
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
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.arrange-pool {
  min-height: 64px;
  padding: 12px 14px;
  background: #f5f7fa;
  border: 1px dashed transparent;
  border-radius: 6px;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.arrange-pool.is-drop-target {
  background: var(--el-color-warning-light-9);
  border-color: var(--el-color-warning);
}

.arrange-pool-tip {
  margin: 0 0 10px;
  font-size: 12px;
  color: #909399;
}

.arrange-pool-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-height: 36px;
}

.arrange-pool-empty {
  font-size: 12px;
  color: #c0c4cc;
  user-select: none;
}

.arrange-btn-chip--available {
  color: #606266;
  cursor: grab;
  background: #fff;
  border: 1px dashed #dcdfe6;
}

.arrange-btn-chip--available:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.arrange-btn-add-icon {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.6;
}

.arrange-editor {
  min-height: 100px;
  padding: 12px 14px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
}

.arrange-preview-tip {
  margin: 0 0 12px;
  font-size: 12px;
  color: #909399;
}

.arrange-preview-empty {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding: 28px 0;
  text-align: center;
}

.arrange-preview-empty__text {
  margin: 0;
  font-size: 13px;
  color: #c0c4cc;
}

.arrange-row-wrapper {
  margin-bottom: 10px;
}

.arrange-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.arrange-row-label {
  font-size: 12px;
  color: #909399;
}

.arrange-preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-height: 46px;
  padding: 8px 10px;
  background: #f5f7fa;
  border: 1px dashed transparent;
  border-radius: 4px;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.arrange-preview-row.is-drop-target {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.arrange-row-drop-hint {
  font-size: 12px;
  color: #c0c4cc;
  user-select: none;
}

.arrange-btn-chip {
  display: inline-flex;
  padding: 6px 14px;
  font-size: 13px;
  color: #fff;
  cursor: grab;
  background: var(--el-color-primary);
  border-radius: 6px;
  transition:
    opacity 0.15s,
    transform 0.1s;
  user-select: none;
  align-items: center;
}

.arrange-btn-chip:active {
  cursor: grabbing;
}

.arrange-btn-chip.is-dragging {
  opacity: 0.4;
  transform: scale(0.95);
}

.arrange-btn-remove {
  margin-left: 6px;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
}

.arrange-btn-remove:hover {
  opacity: 1;
}

.arrange-add-row-btn {
  width: 100%;
  margin-top: 10px;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}
</style>
