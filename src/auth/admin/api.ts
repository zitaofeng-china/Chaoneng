import axios from 'axios'
import type {
  AdminEmailCodePurpose,
  AdminEmailCodeResult,
  AdminPasskey,
  AdminResetTarget,
  AdminSession,
  PasskeyAssertionBody,
  PasskeyChallengeRequest,
  PasskeyChallengeResult,
  PasskeyRegistrationBody,
  SecurityVerificationBody
} from './types'
import { normalizeAdminLoginLogs, type AdminLoginLogsQuery } from './loginLogs'

// 网关前缀由运行时配置或环境变量决定，例如留空、/api 或完整同源地址。
const baseURL = (window as any).APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_PATH

const client = axios.create({
  baseURL,
  timeout: 60000,
  withCredentials: true
})

type ApiResult<T> = {
  code: string
  data: T
  msg: string
}

type RequestFactory<T> = () => Promise<{ data: ApiResult<T> }>

const RATE_LIMIT_CODE = '000006'
const RATE_LIMIT_RETRY = 2
const RATE_LIMIT_DELAY_MS = 1500

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const toApiError = (error: unknown) => {
  if (!error || typeof error !== 'object') return error
  const err = error as {
    code?: unknown
    data?: unknown
    msg?: unknown
    response?: { data?: { code?: unknown; data?: unknown; msg?: unknown } }
  }
  if (typeof err.code === 'string' && (err.msg !== undefined || err.data !== undefined)) {
    return err
  }
  const payload = err.response?.data
  if (payload && typeof payload === 'object' && payload.code != null) return payload
  return error
}

const isRateLimitError = (error: unknown) =>
  String((error as { code?: unknown } | undefined)?.code ?? '') === RATE_LIMIT_CODE

const withRateLimitRetry = async <T>(run: () => Promise<T>): Promise<T> => {
  let last: unknown
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRY; attempt++) {
    try {
      return await run()
    } catch (error) {
      last = toApiError(error)
      if (!isRateLimitError(last) || attempt === RATE_LIMIT_RETRY) {
        return Promise.reject(last)
      }
      await sleep(RATE_LIMIT_DELAY_MS * (attempt + 1))
    }
  }
  return Promise.reject(last)
}

const unwrap = async <T>(factory: RequestFactory<T>) =>
  withRateLimitRetry(async () => {
    try {
      const { data } = await factory()
      if (data.code !== '000000') {
        return Promise.reject(data)
      }
      return data.data
    } catch (error) {
      return Promise.reject(toApiError(error))
    }
  })

const unwrapWithMsg = async <T>(factory: RequestFactory<T>) =>
  withRateLimitRetry(async () => {
    try {
      const { data } = await factory()
      if (data.code !== '000000') {
        return Promise.reject(data)
      }
      return { data: data.data, msg: data.msg }
    } catch (error) {
      return Promise.reject(toApiError(error))
    }
  })

export const loginWithPassword = (data: {
  account: string
  password: string
  email_code?: string
  totp_code?: string
}) =>
  unwrap<AdminSession>(() => client.post('/v1/admin/auth/login', { method: 'password', ...data }))

export const sendAdminEmailCode = (
  data: { account: string; purpose: AdminEmailCodePurpose },
  accessToken?: string
) =>
  unwrap<AdminEmailCodeResult>(() =>
    client.post('/v1/admin/auth/email-code', data, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    })
  )

export const registerAdmin = (data: {
  email: string
  email_code: string
  password: string
  username: string
}) => unwrap<string>(() => client.post('/v1/admin/auth/register', data))

export const resetAdminSecurity = (data: {
  account: string
  email_code: string
  target: AdminResetTarget
  new_password?: string
}) => unwrap<string>(() => client.post('/v1/admin/auth/reset', data))

/** @deprecated 使用 resetAdminSecurity */
export const resetAdminPassword = (data: {
  account: string
  email_code: string
  new_password: string
}) => resetAdminSecurity({ ...data, target: 'password' })

export const loginWithPasskey = (data: PasskeyAssertionBody) =>
  unwrap<AdminSession>(() => client.post('/v1/admin/auth/login', { method: 'passkey', ...data }))

export const createPasskeyChallenge = (data: PasskeyChallengeRequest, accessToken?: string) =>
  unwrap<PasskeyChallengeResult>(() =>
    client.post('/v1/admin/auth/passkey/challenge', data, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    })
  )

const normalizeAdminPasskeyList = (data: unknown): AdminPasskey[] => {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? ((data as { items?: unknown; list?: unknown; passkeys?: unknown; records?: unknown })
          .list ??
        (data as { items?: unknown }).items ??
        (data as { passkeys?: unknown }).passkeys ??
        (data as { records?: unknown }).records ??
        [])
      : []
  if (!Array.isArray(rows)) return []
  return rows.map((item, index) => {
    const row = (item || {}) as Record<string, unknown>
    return {
      id: (row.id ?? row.passkey_id ?? row.credential_id ?? index) as number | string,
      name: String(row.name || '未命名通行密钥'),
      created_at: (row.created_at ?? row.createdAt) as string | number | undefined,
      last_used_at: (row.last_used_at ?? row.lastUsedAt ?? row.last_used) as
        | string
        | number
        | undefined,
      device_id: row.device_id as string | undefined
    }
  })
}

export const listAdminPasskeys = (accessToken: string) =>
  unwrap<unknown>(() =>
    client.get('/v1/admin/security/passkey', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  ).then(normalizeAdminPasskeyList)

export const listAdminLoginLogs = (accessToken: string, params: AdminLoginLogsQuery = {}) => {
  const query: Record<string, string | number> = {
    current_page: params.current_page ?? 1,
    page_size: params.page_size ?? 5
  }
  if (params.status !== undefined && params.status !== '') query.status = params.status
  if (params.start_time !== undefined && params.start_time !== '') {
    query.start_time = params.start_time
  }
  if (params.end_time !== undefined && params.end_time !== '') query.end_time = params.end_time

  return unwrap<unknown>(() =>
    client.get('/v1/admin/login-logs', {
      params: query,
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  ).then(normalizeAdminLoginLogs)
}

export const createAdminPasskey = (
  accessToken: string | undefined,
  data: PasskeyRegistrationBody
) =>
  unwrapWithMsg<string>(() =>
    client.post('/v1/admin/auth/passkey', data, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    })
  )

/** @deprecated 使用 createAdminPasskey */
export const saveAdminPasskey = createAdminPasskey

export const elevateAdminSession = (accessToken: string, data: PasskeyAssertionBody) =>
  unwrap<string>(() =>
    client.put('/v1/admin/security/elevate', data, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  )

export const bindAdminTotp = (accessToken: string, data: SecurityVerificationBody) =>
  unwrap<{ key_url: string }>(() =>
    client.put('/v1/admin/security/totp', data, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  )

export const deleteAdminTotp = (accessToken: string, data: SecurityVerificationBody) =>
  unwrap<string>(() =>
    client.delete('/v1/admin/security/totp', {
      data,
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  )

export const deleteAdminPasskey = (
  accessToken: string,
  id: number | string,
  data: SecurityVerificationBody & { account: string }
) =>
  unwrap<string>(() =>
    client.delete(`/v1/admin/auth/passkey/${encodeURIComponent(String(id))}`, {
      data,
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  )

export const refreshAdminSession = () =>
  unwrap<AdminSession>(() => client.post('/v1/admin/auth/refresh'))

export const logoutAdminSession = (accessToken: string, scope: 'current' | 'all') =>
  unwrap<string>(() =>
    client.post(
      '/v1/admin/auth/logout',
      { scope },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
  )

export const changeAdminPassword = (
  accessToken: string,
  data: { current_password: string; new_password: string }
) =>
  unwrap<string>(() =>
    client.put('/v1/admin/security/password', data, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  )

export const isAdminAuthPath = (url?: string) => Boolean(url?.includes('/v1/admin/auth/'))

export const isAdminElevatePath = (url?: string) =>
  Boolean(url?.includes('/v1/admin/security/elevate'))
