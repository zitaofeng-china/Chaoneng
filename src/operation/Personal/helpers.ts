import dayjs from 'dayjs'
import { toUnixSeconds } from '@/auth/admin/me'
import type { AdminLoginLogView } from '@/auth/admin/loginLogs'

const SCORE_BASE = 70
const SCORE_ITEM = 10

export const maskEmail = (email?: string) => {
  const value = String(email || '').trim()
  if (!value) return '未绑定'
  const at = value.lastIndexOf('@')
  if (at <= 0) return value
  const local = value.slice(0, at)
  const domain = value.slice(at)
  const keep = Math.min(3, local.length)
  const stars = Math.max(local.length - keep, 1)
  return `${local.slice(0, keep)}${'*'.repeat(stars)}${domain}`
}

export const calcSecurityScore = (options: {
  hasAccount: boolean
  hasEmail: boolean
  hasPasskey: boolean
}) => {
  let score = SCORE_BASE
  if (options.hasAccount) score += SCORE_ITEM
  if (options.hasEmail) score += SCORE_ITEM
  if (options.hasPasskey) score += SCORE_ITEM
  return Math.min(100, score)
}

export const countPreAuthMethods = (hasPasskey: boolean, totpEnabled: boolean) =>
  Number(hasPasskey) + Number(totpEnabled)

export const getPreAuthWarning = (options: {
  hasPasskey: boolean
  totpAvailable?: boolean
  totpEnabled: boolean
}) => {
  const totpAvailable = Boolean(options.totpAvailable)
  const count = countPreAuthMethods(options.hasPasskey, options.totpEnabled)
  const available = 1 + Number(totpAvailable)
  if (count >= available) return ''
  if (!totpAvailable) {
    return '待处理：尚未设置通行密钥。管理员账号建议至少配置1种预验证方式'
  }
  return `待处理：你只有${count}种可用的预验证方式。管理员账号建议至少配置2种`
}

export const formatPasskeyTime = (value?: string | number, empty = '从未使用') => {
  const unix = toUnixSeconds(value)
  if (!unix || unix <= 0) return empty
  return dayjs.unix(unix).format('YYYY-MM-DD HH:mm')
}

export const latestPasskeyUsedAt = (list: Array<{ last_used_at?: string | number }>) => {
  const times = list
    .map((item) => toUnixSeconds(item.last_used_at))
    .filter((unix): unix is number => Boolean(unix) && unix > 0)
  if (!times.length) return undefined
  return Math.max(...times)
}

export const formatRelativeTime = (value?: string | number) => {
  const unix = toUnixSeconds(value)
  if (!unix || unix <= 0) return '—'
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unix)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}天前`
  return dayjs.unix(unix).format('YYYY-MM-DD HH:mm')
}

export const formatLoginDevice = (log: Pick<AdminLoginLogView, 'browser' | 'location' | 'os'>) => {
  return [log.location || '未知地址', log.browser, log.os].filter(Boolean).join(' · ')
}

export const loginStatusMeta = (status: AdminLoginLogView['status']) => {
  if (status === 'success') return { label: '成功', type: 'success' as const }
  if (status === 'blocked') return { label: '已拦截', type: 'danger' as const }
  if (status === 'failed') return { label: '失败', type: 'danger' as const }
  return { label: '', type: 'info' as const }
}
