<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElButton, ElEmpty, ElMessage, ElMessageBox, ElSkeleton } from 'element-plus'
import { Qrcode } from '@/components/Qrcode'
import { getGoogleKeyUrlApi, updateGoogleKeyUrlApi } from '@/api/common/login'

const keyUrl = ref('')
const loading = ref(false)
const updateLoading = ref(false)

const fetchKeyUrl = async () => {
  try {
    loading.value = true
    const res = await getGoogleKeyUrlApi()
    keyUrl.value = res.data || ''

    if (!keyUrl.value) {
      ElMessage.warning('暂未获取到谷歌验证码密钥')
    }
  } catch (error) {
    console.error('获取谷歌验证码密钥失败:', error)
  } finally {
    loading.value = false
  }
}

const updateKeyUrl = async () => {
  try {
    await ElMessageBox.confirm('更新后旧二维码将失效，是否继续?', '更新谷歌验证码密钥', {
      confirmButtonText: '确认更新',
      cancelButtonText: '取消',
      type: 'warning'
    })

    updateLoading.value = true
    const res = await updateGoogleKeyUrlApi()
    keyUrl.value = res.data || ''
    ElMessage.success(res.msg || '更新成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新谷歌验证码密钥失败:', error)
    }
  } finally {
    updateLoading.value = false
  }
}

onMounted(fetchKeyUrl)
</script>

<template>
  <div class="google-authenticator">
    <div class="mb-20px flex gap-12px">
      <ElButton type="primary" plain :loading="loading" @click="fetchKeyUrl">刷新</ElButton>
      <ElButton type="warning" :loading="updateLoading" @click="updateKeyUrl">更新密钥</ElButton>
    </div>

    <ElSkeleton v-if="loading && !keyUrl" animated :rows="5" />

    <div v-else-if="keyUrl" class="auth-content">
      <div class="qrcode-wrap">
        <Qrcode :text="keyUrl" :width="220" />
      </div>
      <div class="key-url">{{ keyUrl }}</div>
    </div>

    <ElEmpty v-else description="暂无谷歌验证码密钥">
      <ElButton type="primary" @click="fetchKeyUrl">重新获取</ElButton>
    </ElEmpty>
  </div>
</template>

<style scoped lang="less">
.google-authenticator {
  max-width: 560px;
}

.auth-content {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.qrcode-wrap {
  flex: 0 0 auto;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.key-url {
  min-width: 0;
  padding: 12px;
  font-family: var(--el-font-family);
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  overflow-wrap: anywhere;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

@media (width <= 768px) {
  .auth-content {
    flex-direction: column;
  }
}
</style>
