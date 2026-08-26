import router from './router'
import { useAppStoreWithOut } from '@/store/modules/app'
import type { RouteRecordRaw } from 'vue-router'
import { useTitle } from '@/hooks/web/useTitle'
import { useNProgress } from '@/hooks/web/useNProgress'
import { usePermissionStoreWithOut } from '@/store/modules/permission'
import { usePageLoading } from '@/hooks/web/usePageLoading'
import { BIND_PASSKEY_PATH, NO_REDIRECT_WHITE_LIST } from '@/constants'
import { useUserStoreWithOut } from '@/store/modules/user'
import { ElMessage } from 'element-plus'
import { isOperationSystem } from '@/utils/system'
import { useAdminAuthStoreWithOut } from '@/store/modules/adminAuth'
import { v1GetAdminMe } from '@/api/common/login'
import { buildUserTypeFromAdminMe } from '@/auth/admin/me'
import { hasAdminPasskey } from '@/auth/admin/types'

const { start, done } = useNProgress()

const { loadStart, loadDone } = usePageLoading()

router.beforeEach(async (to, from, next) => {
  start()
  loadStart()
  const permissionStore = usePermissionStoreWithOut()
  const appStore = useAppStoreWithOut()
  const userStore = useUserStoreWithOut()

  const adminAuthStore = useAdminAuthStoreWithOut()
  await adminAuthStore.restoreSession()

  const shouldReloadOperationUser =
    isOperationSystem() &&
    (!userStore.getUserInfo ||
      userStore.getUserInfo.passkey_count == null ||
      (!userStore.getUserInfo.permissions?.length && !userStore.isSuperAdmin))

  if (adminAuthStore.isAuthenticated && shouldReloadOperationUser) {
    if (isOperationSystem()) {
      try {
        const userInfo = await v1GetAdminMe()
        if (userInfo?.data) {
          userStore.setUserInfo(await buildUserTypeFromAdminMe(userInfo.data))
        }
      } catch {
        // Access Token 可用但用户资料获取失败时不伪造登录态，避免进入无权限的后台。
        adminAuthStore.clearSession()
      }
    }
  } else if (adminAuthStore.isAuthenticated && !userStore.getUserInfo) {
    userStore.setUserInfo({ username: '代理' })
  } else if (!adminAuthStore.isAuthenticated) {
    // 两端都已切换到新会话体系，不能再让持久化的旧 JWT 恢复访问。
    userStore.setToken('')
    userStore.setTokenExpiredAt(undefined)
    userStore.setUserInfo(undefined)
    userStore.setRoleRouters([])
  }

  if (userStore.getUserInfo) {
    // 双重检查：同时验证 Pinia store 和 localStorage
    const storeExpiredAt = userStore.getTokenExpiredAt

    // Access Token 不持久化，依赖 Refresh Cookie 恢复；已废弃 localStorage 验证。
    const localExpiredAt: number | null = null

    // 使用两者中较早的过期时间（更严格的验证）
    // 如果 store 和 localStorage 不一致，说明可能被篡改，使用更严格的值
    const expiredAt =
      storeExpiredAt && localExpiredAt
        ? Math.min(storeExpiredAt, localExpiredAt)
        : storeExpiredAt || localExpiredAt

    if (expiredAt && !adminAuthStore.isAuthenticated) {
      const now = Math.floor(Date.now() / 1000) // 当前时间（秒）
      if (now >= expiredAt) {
        ElMessage.warning('登录已过期，请重新登录')
        userStore.logout()
        next(`/login?redirect=${to.path}`)
        return
      }
    }

    if (isOperationSystem() && adminAuthStore.isAuthenticated) {
      const needBind = !hasAdminPasskey(userStore.getUserInfo.passkey_count)
      if (needBind) {
        if (to.path === BIND_PASSKEY_PATH) {
          next()
          return
        }
        const redirect =
          typeof to.query.redirect === 'string'
            ? to.query.redirect
            : to.path !== '/login'
              ? to.fullPath
              : undefined
        next({
          path: BIND_PASSKEY_PATH,
          query: redirect ? { redirect } : {},
          replace: true
        })
        return
      }
      if (to.path === BIND_PASSKEY_PATH) {
        next({ path: '/home', replace: true })
        return
      }
    }

    if (to.path === '/login') {
      next({ path: '/home' })
    } else {
      if (permissionStore.getIsAddRouters) {
        // 检查路由是否存在
        if (to.matched.length === 0) {
          next('/404')
          return
        }
        next()
        return
      }

      // 开发者可根据实际情况进行修改
      const roleRouters = userStore.getRoleRouters || []

      // 是否使用动态路由
      if (appStore.getDynamicRouter) {
        await (appStore.serverDynamicRouter
          ? permissionStore.generateRoutes('server', roleRouters as AppCustomRouteRecordRaw[])
          : permissionStore.generateRoutes('frontEnd', roleRouters as string[]))
      } else {
        await permissionStore.generateRoutes('static')
      }

      // 批量添加路由，减少循环次数
      const addRouters = permissionStore.getAddRouters

      // 确保路由列表不为空
      if (addRouters.length === 0) {
        next('/login')
        return
      }

      addRouters.forEach((route) => {
        router.addRoute(route as unknown as RouteRecordRaw)
      })

      permissionStore.setIsAddRouters(true)
      const redirectPath = from.query.redirect || (to.path === '/' ? '/home' : to.path)
      const redirect = decodeURIComponent(redirectPath as string)
      const nextData = to.path === redirect ? { ...to, replace: true } : { path: redirect }
      next(nextData)
    }
  } else {
    if (NO_REDIRECT_WHITE_LIST.indexOf(to.path) !== -1) {
      next()
    } else {
      next(`/login?redirect=${to.path}`) // 否则全部重定向到登录页
    }
  }
})

router.afterEach((to) => {
  useTitle(to?.meta?.title as string)
  done() // 结束Progress
  loadDone()
})
