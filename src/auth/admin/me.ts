import request from '@/axios'
import type { UserType } from '@/api/common/login/types'
import { normalizePermissionNames } from '@/operation/constants/permissionTable'
import { getAdminSecurity, parseUnixSeconds, type AdminMe } from './types'

export const toUnixSeconds = (value: unknown): number | undefined => parseUnixSeconds(value)

const readPermissions = (me: AdminMe): string[] => {
  const permissions = normalizePermissionNames(getAdminSecurity(me).permissions)
  const roleId = me.role?.id ?? me.role_id
  if (permissions.includes('*')) return ['*']
  if (!permissions.length && roleId === 1) return ['*']
  return permissions
}

export const toUserTypeFromAdminMe = (
  me: AdminMe,
  fallbackName = '',
  permissions?: string[]
): UserType => ({
  permissions: permissions ?? readPermissions(me),
  username: me.username || fallbackName,
  role_ID: me.role?.id ?? me.role_id,
  role_name: getAdminSecurity(me).role_name || me.role?.name,
  created_at: toUnixSeconds(me.created_at),
  passkey_count: getAdminSecurity(me).passkey_count
})

export const resolveAdminPermissions = async (me: AdminMe): Promise<string[]> => {
  const fromMe = readPermissions(me)
  if (fromMe.length) return fromMe

  const roleId = me.role?.id ?? me.role_id
  if (!roleId) return []

  try {
    const res = await request.get<{ permissions?: unknown }>({
      url: `/v2/role/${roleId}`,
      skipErrorHandler: true
    })
    return normalizePermissionNames(res.data?.permissions)
  } catch {
    return []
  }
}

export const buildUserTypeFromAdminMe = async (me: AdminMe, fallbackName = '') =>
  toUserTypeFromAdminMe(me, fallbackName, await resolveAdminPermissions(me))

export const toAccountDetailFromAdminMe = (me: AdminMe): AdminMe => {
  const notify = me.notify
  return {
    ...me,
    created_at: toUnixSeconds(me.created_at) ?? me.created_at,
    updated_at: toUnixSeconds(me.updated_at) ?? me.updated_at,
    notify_threshold: notify?.balance_threshold ?? me.notify_threshold,
    notify_chat_ids: notify?.chat_ids ?? me.notify_chat_ids,
    notify_chat_id: notify?.chat_ids ?? me.notify_chat_id
  }
}
