<template>
  <div class="video-poster-wrapper">
    <img v-if="posterUrl" :src="posterUrl" :alt="alt" class="video-poster-image" />
    <video
      v-else
      :src="src"
      class="video-poster-fallback"
      muted
      preload="metadata"
      disablePictureInPicture
      controlsList="nodownload nofullscreen noremoteplayback"
    ></video>
    <div class="video-poster-play">▶</div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
  }>(),
  {
    alt: '视频封面'
  }
)

const posterUrl = ref('')

const revokePosterUrl = () => {
  if (posterUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(posterUrl.value)
  }
  posterUrl.value = ''
}

const captureVideoPoster = async (src: string) => {
  revokePosterUrl()
  if (!src) return

  const video = document.createElement('video')
  video.src = src
  video.muted = true
  video.preload = 'metadata'
  video.crossOrigin = 'anonymous'
  video.playsInline = true

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.onloadeddata = null
      video.onerror = null
    }

    video.onloadeddata = () => {
      cleanup()
      resolve()
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('视频封面加载失败'))
    }
  }).catch(() => undefined)

  if (!video.videoWidth || !video.videoHeight) return

  try {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    posterUrl.value = canvas.toDataURL('image/jpeg', 0.85)
  } catch (error) {
    posterUrl.value = ''
  }
}

watch(
  () => props.src,
  (src) => {
    if (!src) {
      revokePosterUrl()
      return
    }
    captureVideoPoster(src)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  revokePosterUrl()
})
</script>

<style scoped>
.video-poster-wrapper {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
  align-items: center;
  justify-content: center;
}

.video-poster-image,
.video-poster-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-poster-fallback::-webkit-media-controls-panel {
  display: none !important;
}

/* stylelint-disable-next-line selector-pseudo-element-no-unknown */
.video-poster-fallback::--webkit-media-controls-play-button {
  display: none !important;
}

.video-poster-fallback::-webkit-media-controls {
  display: none !important;
}

.video-poster-play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  width: 28px;
  height: 28px;
  margin-left: 1px;
  color: #fff;
  pointer-events: none;
  background: rgb(0 0 0 / 60%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  align-items: center;
  justify-content: center;
}
</style>
