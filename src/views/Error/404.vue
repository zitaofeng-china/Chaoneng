<script setup lang="ts">
import { Error } from '@/components/Error'
import { useUserStore } from '@/store/modules/user'
import { useRouter } from 'vue-router'

const { push } = useRouter()
const userStore = useUserStore()

const errorClick = () => {
  push('/home')
}

const handleLogout = () => {
  userStore.logoutConfirm()
}
</script>

<template>
  <Error show-logout @error-click="errorClick" @logout-click="handleLogout" />
</template>
