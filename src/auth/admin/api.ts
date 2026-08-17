import axios from 'axios'
import type {
  AdminEmailCodeResult,
  AdminSession,
  PasskeyChallengeResult,
  PasskeyCredentialPayload
} from './types'

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

const unwrap = async <T>(request: Promise<{ data: ApiResult<T> }>) => {
  const { data } = await request
  if (data.code !== '000000') {
    return Promise.reject(data)
  }
  return data.data
}

export const loginWithPassword = (data: { account: string; password: string }) =>
  unwrap<AdminSession>(client.post('/v1/admin/auth/login', { method: 'password', ...data }))

export const sendAdminEmailCode = (data: { email: string; purpose: 'register' | 'reset' }) =>
  unwrap<AdminEmailCodeResult>(client.post('/v1/admin/auth/email-code', data))

export const registerAdmin = (data: {
  email: string
  email_code: string
  password: string
  username: string
}) => unwrap<string>(client.post('/v1/admin/auth/register', data))

export const resetAdminPassword = (data: {
  email: string
  email_code: string
  new_password: string
}) => unwrap<string>(client.post('/v1/admin/auth/reset-password', data))

export const loginWithPasskey = (data: {
  ceremony_id: string
  credential: PasskeyCredentialPayload
  device_id: string
}) => unwrap<AdminSession>(client.post('/v1/admin/auth/login', { method: 'passkey', ...data }))

export const createPasskeyChallenge = (
  data: {
    current_password?: string
    device_id: string
    purpose: 'login' | 'bind' | 'replace'
  },
  accessToken?: string
) =>
  unwrap<PasskeyChallengeResult>(
    client.post('/v1/admin/auth/passkey/challenge', data, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    })
  )

export const saveAdminPasskey = (
  accessToken: string,
  data: {
    ceremony_id: string
    credential: PasskeyCredentialPayload
  }
) =>
  unwrap<string>(
    client.put('/v1/admin/security/passkey', data, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  )

export const deleteAdminPasskey = (accessToken: string, current_password: string) =>
  unwrap<string>(
    client.delete('/v1/admin/security/passkey', {
      data: { current_password },
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  )

export const refreshAdminSession = () => unwrap<AdminSession>(client.post('/v1/admin/auth/refresh'))

export const logoutAdminSession = (accessToken: string, scope: 'current' | 'all') =>
  unwrap<string>(
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
  unwrap<string>(
    client.put('/v1/admin/security/password', data, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  )

export const isAdminAuthPath = (url?: string) => Boolean(url?.includes('/v1/admin/auth/'))
