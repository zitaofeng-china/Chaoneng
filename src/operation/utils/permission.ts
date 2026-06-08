import type { RouteLocationNormalizedLoaded } from 'vue-router'

export const hasRouteButtonPermission = (
  route: RouteLocationNormalizedLoaded,
  permission: string
) => {
  const buttonList = route.meta.buttonList
  return Array.isArray(buttonList) && buttonList.includes(permission)
}
