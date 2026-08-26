import type { RouteRecordRaw, Router } from 'vue-router'
import { useAppStoreWithOut } from '@/store/modules/app'
import { usePermissionStoreWithOut } from '@/store/modules/permission'
import { BIND_PASSKEY_PATH } from '@/constants'
import { getFirstAccessibleRoutePath } from '@/utils/routerHelper'

const isSafeWorkspaceRedirect = (path?: string) =>
  Boolean(
    path &&
      path.startsWith('/') &&
      !path.startsWith('//') &&
      path !== BIND_PASSKEY_PATH &&
      path !== '/login' &&
      path !== '/reset-password'
  )

export const enterOperationWorkspace = async (router: Router, redirect?: string) => {
  const appStore = useAppStoreWithOut()
  const permissionStore = usePermissionStoreWithOut()
  appStore.$patch({ dynamicRouter: false, serverDynamicRouter: false })
  await permissionStore.generateRoutes('static')
  permissionStore.getAddRouters.forEach((route) => {
    router.addRoute(route as unknown as RouteRecordRaw)
  })
  permissionStore.setIsAddRouters(true)
  const path =
    (isSafeWorkspaceRedirect(redirect) ? redirect : undefined) ||
    getFirstAccessibleRoutePath(permissionStore.getAddRouters) ||
    '/home'
  await router.replace({ path })
}
