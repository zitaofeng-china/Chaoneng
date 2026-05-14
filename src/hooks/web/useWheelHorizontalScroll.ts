/**
 * 表格滚轮横向滚动 Hook
 *
 * 用于在表格上使用 Shift + 鼠标滚轮进行横向滚动
 * 默认情况下，只有按住 Shift 键时滚轮才会横向滚动，不会与纵向滚动冲突
 *
 * @example
 * ```vue
 * <template>
 *   <div ref="tableWrapperRef">
 *     <Table ... />
 *   </div>
 * </template>
 *
 * <script setup>
 * import { useWheelHorizontalScroll } from '@/hooks/web/useWheelHorizontalScroll'
 *
 * const tableWrapperRef = ref<HTMLElement | null>(null)
 * // 默认需要按住 Shift 键才能横向滚动
 * useWheelHorizontalScroll(tableWrapperRef)
 *
 * // 或者配置为不需要 Shift 键（旧行为）
 * useWheelHorizontalScroll(tableWrapperRef, { requireShift: false })
 * </script>
 * ```
 */

import { onMounted, onBeforeUnmount, Ref } from 'vue'

export interface UseWheelHorizontalScrollOptions {
  /**
   * 滚动容器的选择器列表（按优先级尝试）
   * 默认会依次尝试：
   * - .el-scrollbar__wrap（Element Plus 新版滚动容器）
   * - .el-table__body-wrapper（Element Plus 老版表格滚动容器）
   */
  scrollSelectors?: string[]

  /**
   * 滚动速度倍数
   * @default 1
   */
  speed?: number

  /**
   * 是否需要按住 Shift 键才能横向滚动
   * @default true
   */
  requireShift?: boolean
}

/**
 * 查找第一个具有横向滚动的容器
 */
function findHorizontalScrollContainer(
  wrapper: HTMLElement,
  selectors: string[]
): HTMLElement | null {
  for (const selector of selectors) {
    const elements = Array.from(wrapper.querySelectorAll<HTMLElement>(selector))
    for (const el of elements) {
      if (el.scrollWidth > el.clientWidth) {
        return el
      }
    }
  }
  return null
}

/**
 * 表格滚轮横向滚动
 * @param wrapperRef 包裹表格的容器元素引用
 * @param options 配置选项
 */
export function useWheelHorizontalScroll(
  wrapperRef: Ref<HTMLElement | null>,
  options: UseWheelHorizontalScrollOptions = {}
) {
  const {
    scrollSelectors = ['.el-scrollbar__wrap', '.el-table__body-wrapper'],
    speed = 1,
    requireShift = true
  } = options

  const handleWheelScroll = (e: WheelEvent) => {
    if (!wrapperRef.value) return

    // 如果需要按住 Shift 键才能横向滚动
    if (requireShift) {
      // 只有按住 Shift 键时才进行横向滚动
      if (!e.shiftKey) return
    } else {
      // 如果不需要 Shift 键，则直接横向滚动（旧逻辑）
      // 这种情况下，如果用户按住 shift，让浏览器原生处理
      if (e.shiftKey) return
    }

    // 查找第一个有横向滚动的容器
    const scrollWrapper = findHorizontalScrollContainer(wrapperRef.value, scrollSelectors)
    if (!scrollWrapper) return

    // 阻止默认的纵向滚动，转为横向
    e.preventDefault()
    scrollWrapper.scrollLeft += e.deltaY * speed
  }

  onMounted(() => {
    wrapperRef.value?.addEventListener('wheel', handleWheelScroll, { passive: false })
  })

  onBeforeUnmount(() => {
    wrapperRef.value?.removeEventListener('wheel', handleWheelScroll)
  })

  return {
    handleWheelScroll
  }
}
