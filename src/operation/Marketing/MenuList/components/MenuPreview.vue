<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Dialog } from '@/components/Dialog'
import {
  batchUpdateBotMenu,
  getBotMenuList,
  type BotMenuItem,
  type UpdateBotMenuItemParams
} from '@/api/opertion/common/menuList'
import { useDraggable } from '@/hooks/event/useDraggable'
import { getErrorMessage } from '@/utils/messageHelper'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const sortVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const COLUMN_COUNT = 3
const TOTAL_SPAN = 24

interface MenuItemWithExtras extends BotMenuItem {
  span?: number
  _fromEnabled?: boolean
  _fromDisabled?: boolean
}

type MenuLayout = (MenuItemWithExtras | null)[][]

const loading = ref(false)
const keyboardLayout = ref<MenuLayout>([])
const disabledMenus = ref<MenuItemWithExtras[]>([])
const isOverDisabledZone = ref(false)
const dragStartPosition = ref<{ row: number; col: number } | null>(null)

const collectMenuItems = (layout: MenuLayout): MenuItemWithExtras[] => {
  return layout.flat().filter((item): item is MenuItemWithExtras => item !== null)
}

const compactLayout = (items: MenuItemWithExtras[]): MenuLayout => {
  if (items.length === 0) return []

  const rowCount = Math.ceil(items.length / COLUMN_COUNT)
  const layout: MenuLayout = Array.from({ length: rowCount }, () => Array(COLUMN_COUNT).fill(null))

  items.forEach((item, index) => {
    const row = Math.floor(index / COLUMN_COUNT)
    const col = index % COLUMN_COUNT
    layout[row][col] = item
  })

  return layout.map((row) => {
    const validCount = row.filter((item) => item !== null).length
    const span = validCount > 0 ? TOTAL_SPAN / validCount : 0
    return row.map((item) => (item ? { ...item, span } : null))
  })
}

const reassignGlobalOrderNum = (enabled: MenuItemWithExtras[], disabled: MenuItemWithExtras[]) => {
  const total = enabled.length + disabled.length
  enabled.forEach((item, index) => {
    item.order_num = total - index
  })
  disabled.forEach((item, index) => {
    item.order_num = total - enabled.length - index
  })
}

const refreshOrderNum = (enabledItems: MenuItemWithExtras[]) => {
  reassignGlobalOrderNum(enabledItems, disabledMenus.value)
}

const convertToKeyboardLayout = (list: BotMenuItem[]): MenuLayout => {
  const enabledList = list
    .filter((item) => item.status === 1)
    .map((item) => ({ ...item }))
    .sort((a, b) => b.order_num - a.order_num)

  const disabledList = list
    .filter((item) => item.status === 2)
    .map((item) => ({ ...item }))
    .sort((a, b) => b.order_num - a.order_num)

  reassignGlobalOrderNum(enabledList, disabledList)
  disabledMenus.value = disabledList

  return compactLayout(enabledList)
}

const fetchMenuList = async () => {
  try {
    loading.value = true
    const response = await getBotMenuList({ bot_id: 0 })

    if (response.code === '000000' && response.data) {
      keyboardLayout.value = convertToKeyboardLayout(
        Array.isArray(response.data) ? response.data : []
      )
      return
    }

    keyboardLayout.value = []
    disabledMenus.value = []
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '获取菜单列表失败'))
    keyboardLayout.value = []
    disabledMenus.value = []
  } finally {
    loading.value = false
  }
}

const saveMenuConfig = async () => {
  if (loading.value) return false

  try {
    loading.value = true

    const enabledItems = collectMenuItems(keyboardLayout.value)
    const allItems = [...enabledItems, ...disabledMenus.value]

    if (allItems.length === 0) {
      ElMessage.warning('没有可保存的菜单项')
      return false
    }

    const updateParams: UpdateBotMenuItemParams[] = allItems.map((item) => ({
      id: item.id,
      menu_name: item.menu_name,
      order_num: item.order_num,
      status: item.status,
      whitelist: Array.isArray(item.whitelist)
        ? item.whitelist.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
        : []
    }))

    await batchUpdateBotMenu({
      bot_id: 0,
      menus: updateParams
    })

    await fetchMenuList()
    ElMessage.success('菜单排序保存成功')
    return true
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '保存菜单排序失败'))
    return false
  } finally {
    loading.value = false
  }
}

const {
  isDragging,
  dragItem,
  handleDragEnd: originalHandleDragEnd
} = useDraggable<MenuItemWithExtras>()

const resetDragState = () => {
  isDragging.value = false
  dragItem.value = null
  dragStartPosition.value = null
  isOverDisabledZone.value = false
}

const handleDragEnd = () => {
  originalHandleDragEnd()
  resetDragState()
}

const handleEnabledItemDragStart = (
  item: MenuItemWithExtras,
  rowIndex: number,
  colIndex: number,
  e: DragEvent
) => {
  if (!e.dataTransfer) return

  isDragging.value = true
  dragItem.value = { ...item, _fromEnabled: true }
  dragStartPosition.value = { row: rowIndex, col: colIndex }

  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData(
    'text/plain',
    JSON.stringify({ fromEnabled: true, menu_name: item.menu_name })
  )
}

const handleEnabledItemDragOver = (e: DragEvent) => {
  if (!isDragging.value || !dragItem.value) return

  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

const computeInsertIndex = (targetRow: number, targetCol: number): number => {
  const items = collectMenuItems(keyboardLayout.value)
  const targetItem = keyboardLayout.value[targetRow]?.[targetCol]
  if (!targetItem) return items.length

  const index = items.findIndex((item) => item.menu_name === targetItem.menu_name)
  return index === -1 ? items.length : index
}

const handleEnabledItemDrop = (e: DragEvent, targetRow: number, targetCol: number) => {
  e.preventDefault()

  if (!isDragging.value || !dragItem.value) {
    resetDragState()
    return
  }

  const isFromDisabled = dragItem.value._fromDisabled
  const isFromEnabled = dragItem.value._fromEnabled

  if (isFromDisabled) {
    const itemToEnable = dragItem.value
    const indexToRemove = disabledMenus.value.findIndex(
      (item) => item.menu_name === itemToEnable.menu_name
    )

    if (indexToRemove === -1) {
      resetDragState()
      return
    }

    disabledMenus.value.splice(indexToRemove, 1)

    const allEnabledItems = collectMenuItems(keyboardLayout.value)
    const insertIndex = computeInsertIndex(targetRow, targetCol)
    allEnabledItems.splice(insertIndex, 0, {
      ...itemToEnable,
      status: 1
    })

    refreshOrderNum(allEnabledItems)
    keyboardLayout.value = compactLayout(allEnabledItems)
    resetDragState()
    return
  }

  if (isFromEnabled && dragStartPosition.value) {
    const { row: startRow, col: startCol } = dragStartPosition.value

    if (startRow === targetRow && startCol === targetCol) {
      resetDragState()
      return
    }

    const allEnabledItems = collectMenuItems(keyboardLayout.value)
    const draggedIndex = allEnabledItems.findIndex(
      (item) => item.menu_name === dragItem.value?.menu_name
    )
    const targetItem = keyboardLayout.value[targetRow]?.[targetCol]

    if (draggedIndex === -1 || !targetItem) {
      resetDragState()
      return
    }

    const targetIndex = allEnabledItems.findIndex((item) => item.menu_name === targetItem.menu_name)
    if (targetIndex === -1) {
      resetDragState()
      return
    }

    const [draggedItem] = allEnabledItems.splice(draggedIndex, 1)
    allEnabledItems.splice(targetIndex, 0, draggedItem)

    refreshOrderNum(allEnabledItems)
    keyboardLayout.value = compactLayout(allEnabledItems)
    resetDragState()
  }
}

const handleDisabledZoneDragOver = (e: DragEvent) => {
  if (!isDragging.value || !dragItem.value?._fromEnabled) return

  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

const handleDisabledZoneDragEnter = (e: DragEvent) => {
  if (!isDragging.value || !dragItem.value?._fromEnabled) return

  e.preventDefault()
  isOverDisabledZone.value = true
}

const handleDisabledZoneDragLeave = (e: DragEvent) => {
  const target = e.currentTarget as HTMLElement
  const relatedTarget = e.relatedTarget as HTMLElement
  if (target && !target.contains(relatedTarget)) {
    isOverDisabledZone.value = false
  }
}

const handleDisabledZoneDrop = (e: DragEvent) => {
  e.preventDefault()
  isOverDisabledZone.value = false

  if (!dragItem.value || !dragItem.value._fromEnabled) {
    resetDragState()
    return
  }

  const itemToDisable = dragItem.value
  const allEnabledItems = collectMenuItems(keyboardLayout.value)
  const itemIndex = allEnabledItems.findIndex((item) => item.menu_name === itemToDisable.menu_name)

  if (itemIndex === -1) {
    resetDragState()
    return
  }

  const updatedEnabledItems = allEnabledItems.filter(
    (item) => item.menu_name !== itemToDisable.menu_name
  )

  disabledMenus.value.push({
    ...itemToDisable,
    status: 2
  })

  refreshOrderNum(updatedEnabledItems)
  keyboardLayout.value = compactLayout(updatedEnabledItems)
  resetDragState()
}

const handleDisabledItemDragStart = (item: MenuItemWithExtras, e: DragEvent) => {
  if (!e.dataTransfer) return

  isDragging.value = true
  dragItem.value = { ...item, _fromDisabled: true }

  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData(
    'text/plain',
    JSON.stringify({ fromDisabled: true, menu_name: item.menu_name })
  )
}

const handlePreviewDragOver = (e: DragEvent) => {
  if (!isDragging.value || !dragItem.value) return

  if (dragItem.value._fromDisabled || dragItem.value._fromEnabled) {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
  }
}

const handlePreviewDragLeave = (e: DragEvent) => {
  e.preventDefault()
}

const handlePreviewDrop = (e: DragEvent) => {
  e.preventDefault()

  if (!isDragging.value || !dragItem.value) {
    resetDragState()
    return
  }

  if (!dragItem.value._fromDisabled) {
    resetDragState()
    return
  }

  const itemToEnable = dragItem.value
  const indexToRemove = disabledMenus.value.findIndex(
    (item) => item.menu_name === itemToEnable.menu_name
  )

  if (indexToRemove === -1) {
    resetDragState()
    return
  }

  disabledMenus.value.splice(indexToRemove, 1)

  const allEnabledItems = collectMenuItems(keyboardLayout.value)
  allEnabledItems.push({
    ...itemToEnable,
    status: 1
  })

  refreshOrderNum(allEnabledItems)
  keyboardLayout.value = compactLayout(allEnabledItems)
  resetDragState()
}

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSave = async () => {
  const success = await saveMenuConfig()
  if (success) {
    handleClose()
  }
}

watch(
  () => sortVisible.value,
  (newVal) => {
    if (newVal) {
      fetchMenuList()
    } else {
      resetDragState()
    }
  }
)
</script>

<template>
  <Dialog v-model="sortVisible" title="菜单排序" width="900px" @close="handleClose">
    <div class="menu-sort-container" v-loading="loading" loading-text="加载中...">
      <div class="enabled-section">
        <div class="section-header">
          <span class="section-title">启用的菜单</span>
          <span class="section-tip">拖拽到下方禁用</span>
        </div>
        <div
          class="menu-preview"
          @dragover="handlePreviewDragOver"
          @dragleave="handlePreviewDragLeave"
          @drop="handlePreviewDrop"
        >
          <div v-if="keyboardLayout.length === 0 && !loading" class="empty-tip">
            暂无启用的菜单
          </div>
          <el-row v-else :gutter="20">
            <template v-for="(row, rowIndex) in keyboardLayout" :key="rowIndex">
              <el-col :span="item?.span || 24" v-for="(item, colIndex) in row" :key="colIndex">
                <div
                  v-if="item"
                  class="menu-item"
                  :class="{ 'is-dragging': isDragging && dragItem?.menu_name === item?.menu_name }"
                  draggable="true"
                  @dragstart="(e) => handleEnabledItemDragStart(item, rowIndex, colIndex, e)"
                  @dragend="handleDragEnd"
                  @dragover="handleEnabledItemDragOver"
                  @drop="(e) => handleEnabledItemDrop(e, rowIndex, colIndex)"
                >
                  <el-button type="info" class="menu-button">
                    {{ item.menu_name }}
                  </el-button>
                </div>
              </el-col>
            </template>
          </el-row>
        </div>
      </div>

      <div class="disabled-section-wrapper">
        <div class="section-header">
          <span class="section-title">禁用的菜单</span>
          <span class="section-tip">拖拽到上方启用</span>
        </div>
        <div
          class="disabled-section"
          :class="{ 'drag-over': isOverDisabledZone }"
          @dragover="handleDisabledZoneDragOver"
          @dragenter="handleDisabledZoneDragEnter"
          @dragleave="handleDisabledZoneDragLeave"
          @drop="handleDisabledZoneDrop"
        >
          <div v-if="disabledMenus.length === 0 && !loading" class="empty-tip">
            暂无禁用的菜单
          </div>
          <div v-else class="disabled-menu-list">
            <div
              v-for="item in disabledMenus"
              :key="item.menu_name"
              class="disabled-menu-item"
              :class="{ 'is-dragging': isDragging && dragItem?.menu_name === item?.menu_name }"
              draggable="true"
              @dragstart="(e) => handleDisabledItemDragStart(item, e)"
              @dragend="handleDragEnd"
            >
              <el-button type="info" plain class="disabled-menu-button">
                {{ item.menu_name }}
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="handleClose" :disabled="loading">取消</ElButton>
        <ElButton type="primary" :loading="loading" @click="handleSave">保存排序</ElButton>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.menu-sort-container {
  position: relative;
  min-height: 400px;
}

:deep(.el-loading-mask) {
  z-index: 1000;
  border-radius: 8px;
}

.enabled-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: #f0f2f5;
  border-left: 3px solid #67c23a;
  border-radius: 4px;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #67c23a;
}

.section-tip {
  font-size: 14px;
  font-weight: bold;
  color: #000;
}

.menu-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 150px;
  padding: 15px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
  border: 2px dashed #d0d7de;
  border-radius: 8px;
  transition: all 0.3s;
}

.menu-item {
  height: 100%;
  min-height: 36px;
  padding: 0 8px;
  margin-bottom: 12px;
  cursor: move;
  transition: all 0.3s;
}

.menu-button {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
  word-break: break-all;
  white-space: normal;
  pointer-events: none;
  cursor: move;
  border-radius: 6px;
  transition: all 0.3s;
}

.menu-item:hover .menu-button {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgb(0 0 0 / 10%);
}

.is-dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.disabled-section-wrapper {
  margin-top: 20px;
}

.disabled-section {
  display: flex;
  min-height: 120px;
  padding: 15px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
  border: 2px dashed #d0d7de;
  border-radius: 8px;
  transition: all 0.3s;
}

.disabled-section.drag-over {
  background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%);
  border-color: #f56c6c;
  box-shadow: 0 0 20px rgb(245 108 108 / 20%);
}

.disabled-section-wrapper .section-header {
  border-left-color: #f56c6c;
}

.disabled-section-wrapper .section-title {
  color: #f56c6c;
}

.disabled-menu-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}

.disabled-menu-item {
  cursor: move;
  transition: all 0.3s;
}

.disabled-menu-item:hover {
  transform: translateY(-2px);
}

.disabled-menu-item.is-dragging {
  opacity: 0.5;
}

.disabled-menu-button {
  height: 32px;
  padding: 6px 12px;
  font-size: 13px;
  pointer-events: none;
  cursor: move;
  border-radius: 4px;
  transition: all 0.3s;
}

.disabled-menu-item:hover .disabled-menu-button {
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.empty-tip {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  padding: 0;
  font-size: 13px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
