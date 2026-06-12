<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePermissionStore } from '@/store/modules/permission'
import { getFirstAccessibleRoutePath } from '@/utils/routerHelper'

const router = useRouter()
const permissionStore = usePermissionStore()

onMounted(() => {
  const targetPath = getFirstAccessibleRoutePath(permissionStore.getAddRouters) || '/404'
  router.replace(targetPath)
})
</script>

<template>
  <div></div>
</template>
