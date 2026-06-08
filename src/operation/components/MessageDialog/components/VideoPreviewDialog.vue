<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="el-image-viewer__wrapper"
      style="z-index: 3000"
      @click.self="handleClose"
    >
      <div class="el-image-viewer__mask" @click="handleClose"></div>

      <span class="el-image-viewer__btn el-image-viewer__close" @click="handleClose">
        <Icon icon="ep:close" />
      </span>

      <div class="el-image-viewer__canvas">
        <div v-if="videoUrl" class="video-preview-wrapper" @click.stop>
          <video
            v-if="visible"
            ref="videoPlayerRef"
            class="video-js vjs-default-skin vjs-big-play-centered"
            controls
            preload="auto"
            disablePictureInPicture
            controlslist="nodownload nofullscreen noremoteplayback"
          >
            <p class="vjs-no-js">您的浏览器不支持视频播放，请升级浏览器。</p>
          </video>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import type Player from 'video.js/dist/types/player'
import { Icon } from '@/components/Icon'
import { handleErrorMessage } from '@/utils/messageHelper'

const props = defineProps<{
  visible: boolean
  videoUrl?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const videoPlayerRef = ref<HTMLVideoElement | null>(null)
let player: Player | null = null

const disposeVideoPlayer = () => {
  if (!player) return

  try {
    player.dispose()
  } catch (error) {
    handleErrorMessage(error, '关闭视频预览失败')
  } finally {
    player = null
  }
}

const initVideoPlayer = () => {
  disposeVideoPlayer()

  setTimeout(() => {
    if (!videoPlayerRef.value || !props.videoUrl) return

    try {
      player = videojs(videoPlayerRef.value, {
        controls: true,
        autoplay: true,
        preload: 'auto',
        fluid: true,
        aspectRatio: '16:9',
        language: 'zh-CN',
        playbackRates: [0.5, 1, 1.5, 2],
        controlBar: {
          volumePanel: { inline: false },
          pictureInPictureToggle: false
        },
        sources: [{ src: props.videoUrl, type: 'video/mp4' }]
      })

      videoPlayerRef.value.disablePictureInPicture = true
    } catch (error) {
      handleErrorMessage(error, '初始化视频预览失败')
    }
  }, 100)
}

const handleClose = () => {
  disposeVideoPlayer()
  emit('update:visible', false)
}

watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      await nextTick()
      await nextTick()
      initVideoPlayer()
      return
    }

    disposeVideoPlayer()
  }
)

onBeforeUnmount(() => {
  disposeVideoPlayer()
})
</script>

<style scoped>
.el-image-viewer__wrapper {
  position: fixed;
  inset: 0;
}

.el-image-viewer__mask {
  position: absolute;
  inset: 0;
  background: #000;
  opacity: 0.5;
}

.el-image-viewer__btn {
  position: absolute;
  z-index: 1;
  display: flex;
  width: 44px;
  height: 44px;
  font-size: 24px;
  color: #fff;
  cursor: pointer;
  background-color: #606266;
  border-radius: 50%;
  opacity: 0.8;
  box-sizing: border-box;
  user-select: none;
  align-items: center;
  justify-content: center;
}

.el-image-viewer__btn:hover {
  opacity: 1;
}

.el-image-viewer__close {
  top: 40px;
  right: 40px;
}

.el-image-viewer__canvas {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-preview-wrapper {
  width: 100%;
  max-width: 90vw;
  max-height: 90vh;
}

.video-preview-wrapper .video-js {
  width: 100%;
  height: auto;
  max-height: 90vh;
}

.video-js .vjs-picture-in-picture-control {
  display: none !important;
}
</style>
