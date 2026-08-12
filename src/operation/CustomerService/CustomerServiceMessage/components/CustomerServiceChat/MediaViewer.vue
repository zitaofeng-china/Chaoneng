<template>
  <el-dialog
    v-model="visibleModel"
    :title="viewingVideo ? '查看视频' : '查看图片'"
    width="min(1200px, 96vw)"
  >
    <div v-if="!viewingVideo" class="image-viewer-toolbar"
      ><el-button size="small" :disabled="imageZoom <= 0.25" @click="changeImageZoom(-0.25)"
        >缩小</el-button
      ><span>{{ Math.round(imageZoom * 100) }}%</span
      ><el-button size="small" :disabled="imageZoom >= 2" @click="changeImageZoom(0.25)"
        >放大</el-button
      ><el-button size="small" @click="resetImageZoom">重置</el-button></div
    >
    <div
      ref="imageViewerStage"
      class="image-viewer-stage"
      @wheel.ctrl.prevent="handleImageZoomWheel"
      ><video
        v-if="viewingVideo"
        ref="imageViewerVideo"
        class="video-viewer"
        :src="viewingVideo"
        controls
        autoplay
        playsinline
        disablepictureinpicture
        @contextmenu.prevent /><img
        v-else-if="viewingImage"
        ref="imageViewerImage"
        class="image-viewer"
        :style="{ width: imageViewerBaseWidth ? `${imageViewerBaseWidth * imageZoom}px` : '100%' }"
        :src="viewingImage"
        alt="图片预览"
        @load="fitImageToViewer"
        @dblclick="changeImageZoom(imageZoom < 1.5 ? 0.5 : -0.5)"
    /></div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (event: 'update:visible', value: boolean): void }>()
const visibleModel = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})
const viewingImage = ref('')
const viewingVideo = ref('')
const imageZoom = ref(1)
const imageViewerStage = ref<HTMLElement>()
const imageViewerImage = ref<HTMLImageElement>()
const imageViewerVideo = ref<HTMLVideoElement>()
const imageViewerBaseWidth = ref<number>()
function openImage(url: string) {
  if (!url) return
  imageZoom.value = 1
  viewingVideo.value = ''
  if (viewingImage.value !== url) imageViewerBaseWidth.value = undefined
  viewingImage.value = url
  visibleModel.value = true
  void nextTick(() =>
    window.requestAnimationFrame(() => {
      const image = imageViewerImage.value
      if (image?.complete) fitImageElementToViewer(image)
    })
  )
}
function openVideo(url: string) {
  if (!url) return
  viewingImage.value = ''
  viewingVideo.value = url
  visibleModel.value = true
  void nextTick(() => imageViewerVideo.value?.play().catch(() => undefined))
}
function fitImageToViewer(event: Event) {
  fitImageElementToViewer(event.target as HTMLImageElement)
}
function fitImageElementToViewer(image: HTMLImageElement) {
  const stage = imageViewerStage.value
  if (!stage || !image.naturalWidth || !image.naturalHeight) return
  const scale = Math.min(
    stage.clientWidth / image.naturalWidth,
    stage.clientHeight / image.naturalHeight
  )
  imageViewerBaseWidth.value = Math.max(1, Math.floor(image.naturalWidth * scale))
  imageZoom.value = 1
}
function changeImageZoom(delta: number) {
  imageZoom.value = Math.min(2, Math.max(0.25, Number((imageZoom.value + delta).toFixed(2))))
}
function resetImageZoom() {
  imageZoom.value = 1
}
function handleImageZoomWheel(event: WheelEvent) {
  changeImageZoom(event.deltaY < 0 ? 0.1 : -0.1)
}
defineExpose({ openImage, openVideo })
</script>

<style scoped lang="less">
.image-viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-bottom: 10px;

  span {
    min-width: 48px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
}

.image-viewer-stage {
  display: flex;
  width: 100%;
  height: min(72vh, 760px);
  overflow: auto;
  background: var(--el-fill-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  align-items: safe center;
  justify-content: safe center;
}

.image-viewer {
  display: block;
  flex: 0 0 auto;
  max-width: none;
  margin: 0;
  cursor: zoom-in;
  object-fit: contain;
}

.video-viewer {
  display: block;
  width: 100%;
  max-height: min(72vh, 760px);
  margin: 0 auto;
  background: #000;
  object-fit: contain;
}
</style>
