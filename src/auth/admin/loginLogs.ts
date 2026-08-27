import { composeIpAddress } from '@/auth/admin/ipLocation'

/** GET /v1/admin/login-logs 查询参数（与后端约定字段一致）。 */
export interface AdminLoginLogsQuery {
  current_page?: number
  page_size?: number
  status?: string | number
  start_time?: number | string
  end_time?: number | string
}

/** 页面展示用，不作为接口合同。 */
export interface AdminLoginLogView {
  browser: string
  id: string
  ip: string
  location: string
  os: string
  status: 'blocked' | 'failed' | 'success' | 'unknown'
  time?: number | string
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

const pickString = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

const pickTime = (row: Record<string, unknown>) => {
  for (const key of ['created_at', 'login_at', 'login_time', 'logged_at', 'time', 'timestamp']) {
    const value = row[key]
    if (value == null || value === '') continue
    if (typeof value === 'string' || typeof value === 'number') return value
  }
  return undefined
}

const collectRows = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data
  const rec = asRecord(data)
  if (!rec) return []
  const nested = rec.list ?? rec.items ?? rec.records ?? rec.logs ?? rec.rows ?? rec.data
  if (Array.isArray(nested)) return nested
  const inner = asRecord(nested)
  if (!inner) return []
  const again = inner.list ?? inner.items ?? inner.records ?? inner.logs ?? inner.rows
  return Array.isArray(again) ? again : []
}

const parseUserAgent = (ua: string) => {
  const text = ua.trim()
  if (!text) return { browser: '', os: '' }

  let os = ''
  if (/Windows NT/i.test(text)) os = 'Windows'
  else if (/Mac OS X|Macintosh/i.test(text)) os = 'macOS'
  else if (/Android/i.test(text)) os = 'Android'
  else if (/iPad/i.test(text)) os = 'iPadOS'
  else if (/iPhone|iOS/i.test(text)) os = 'iOS'
  else if (/Linux/i.test(text)) os = 'Linux'

  let browser = ''
  if (/Edg\//i.test(text)) browser = 'Edge'
  else if (/OPR\/|Opera/i.test(text)) browser = 'Opera'
  else if (/Chrome\//i.test(text)) browser = 'Chrome'
  else if (/Firefox\//i.test(text)) browser = 'Firefox'
  else if (/Safari\//i.test(text)) browser = 'Safari'

  return { browser, os }
}

const normalizeStatus = (value: unknown): AdminLoginLogView['status'] => {
  if (typeof value === 'boolean') return value ? 'success' : 'failed'
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
  if (!text) return 'unknown'
  if (['1', 'ok', 'success', 'succeeded', 'successful', 'pass', '成功'].includes(text)) {
    return 'success'
  }
  if (['blocked', 'intercepted', 'denied', 'rejected', 'forbid', '已拦截', '拦截'].includes(text)) {
    return 'blocked'
  }
  if (['0', '2', 'fail', 'failed', 'error', 'failure', '失败'].includes(text)) {
    return 'failed'
  }
  return 'unknown'
}

const pickLocation = (row: Record<string, unknown>) => {
  const nested = asRecord(row.location) || asRecord(row.geo) || asRecord(row.region)
  const city =
    pickString(row, ['city', 'city_name']) ||
    (nested ? pickString(nested, ['city', 'city_name', 'name']) : '')
  const region =
    pickString(row, ['region', 'province', 'area']) ||
    (nested ? pickString(nested, ['region', 'province', 'area']) : '')
  const country =
    pickString(row, ['country', 'country_name', 'country_code']) ||
    (nested ? pickString(nested, ['country', 'country_name', 'country_code']) : '')
  const composed = composeIpAddress(city, region, country)
  if (composed) return composed
  if (nested) return pickString(nested, ['location', 'address', 'display', 'label'])
  return pickString(row, ['location', 'address', 'geo_location'])
}

export const normalizeAdminLoginLogs = (data: unknown): AdminLoginLogView[] => {
  return collectRows(data).map((item, index) => {
    const row = asRecord(item) || {}
    const ua = pickString(row, ['agent', 'user_agent', 'userAgent', 'ua'])
    const parsed = parseUserAgent(ua)
    const browser = pickString(row, ['browser', 'browser_name']) || parsed.browser
    const os = pickString(row, ['os', 'os_name', 'platform', 'system']) || parsed.os
    return {
      id: pickString(row, ['id', 'log_id', 'login_id']) || String(index),
      location: pickLocation(row),
      browser,
      os,
      ip: pickString(row, ['ip', 'client_ip', 'ip_address', 'ip_addr', 'remote_ip', 'remote_addr']),
      time: pickTime(row),
      status: normalizeStatus(row.status ?? row.login_status ?? row.result ?? row.state)
    }
  })
}
