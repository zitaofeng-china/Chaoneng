import { ElMessage } from 'element-plus'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { PendingMedia } from './types'

interface UsePendingMediaOptions {
  onMediaLayoutChange: () => void | Promise<void>
}

/** 待发送文件、预览地址和页面级拖拽投放。 */
export function usePendingMedia(options: UsePendingMediaOptions) {
  const pendingImages = ref<PendingMedia[]>([])
  const isDraggingImages = ref(false)
  let dragDepth = 0

  function readPreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function hasDraggedFiles(event: DragEvent) {
    return event.dataTransfer?.types.includes('Files')
  }

  function handleWindowDragEnter(event: DragEvent) {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    dragDepth += 1
    isDraggingImages.value = true
  }

  function handleWindowDragOver(event: DragEvent) {
    if (hasDraggedFiles(event)) event.preventDefault()
  }

  function handleWindowDragLeave(event: DragEvent) {
    if (!hasDraggedFiles(event)) return
    dragDepth = Math.max(0, dragDepth - 1)
    if (!dragDepth) isDraggingImages.value = false
  }

  function handleWindowDrop(event: DragEvent) {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    isDraggingImages.value = false
    dragDepth = 0
    void addMedia(Array.from(event.dataTransfer?.files ?? []))
  }

  async function addMedia(files: File[]) {
    const available = 10 - pendingImages.value.length
    if (available <= 0) return ElMessage.warning('最多可发送 10 个文件')
    const validMedia = files.slice(0, available).filter((file) => file.size <= 5 * 1024 * 1024)
    if (validMedia.length < files.slice(0, available).length)
      ElMessage.warning('单个文件不能超过 5MB')
    if (files.length > available) ElMessage.warning('最多可发送 10 个文件')
    if (!validMedia.length) return

    const previewUrls = await Promise.all(
      validMedia.map((file) => {
        const isPreviewable = file.type.startsWith('image/') || file.type.startsWith('video/')
        return isPreviewable ? readPreview(file) : Promise.resolve(undefined)
      })
    )
    pendingImages.value.push(
      ...validMedia.map((file, index): PendingMedia => {
        const mediaKind: PendingMedia['mediaKind'] = file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
            ? 'video'
            : 'file'
        return { file, previewUrl: previewUrls[index], mediaKind }
      })
    )
    void options.onMediaLayoutChange()
  }

  function removePendingImage(index: number) {
    pendingImages.value.splice(index, 1)
    void options.onMediaLayoutChange()
  }

  onMounted(() => {
    window.addEventListener('dragenter', handleWindowDragEnter)
    window.addEventListener('dragover', handleWindowDragOver)
    window.addEventListener('dragleave', handleWindowDragLeave)
    window.addEventListener('drop', handleWindowDrop)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('dragenter', handleWindowDragEnter)
    window.removeEventListener('dragover', handleWindowDragOver)
    window.removeEventListener('dragleave', handleWindowDragLeave)
    window.removeEventListener('drop', handleWindowDrop)
  })

  return { pendingImages, isDraggingImages, addMedia, removePendingImage }
}
