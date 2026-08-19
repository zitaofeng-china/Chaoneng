import axios from 'axios'
import type {
  AdminEmailCodePurpose,
  AdminEmailCodeResult,
  AdminResetTarget,
  AdminSession,
  PasskeyChallengePurpose,
  PasskeyChallengeResult,
  PasskeyCredentialPayload,
  SecurityVerificationMethod
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

export const loginWithPassword = (data: {
  account: string
  password: string
  totp_code?: string
}) => unwrap<AdminSession>(client.post('/v1/admin/auth/login', { method: 'password', ...data }))

export const sendAdminEmailCode = (
  data: { email?: string; purpose: AdminEmailCodePurpose },
  accessToken?: string
) =>
  unwrap<AdminEmailCodeResult>(
    client.post('/v1/admin/auth/email-code', data, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    })
  )

export const registerAdmin = (data: {
  email: string
  email_code: string
  password: string
  username: string
}) => unwrap<string>(client.post('/v1/admin/auth/register', data))

export const resetAdminSecurity = (data: {
  email: string
  email_code: string
  target: AdminResetTarget
  new_password?: string
}) => unwrap<string>(client.post('/v1/admin/auth/reset', data))

/** @deprecated 使用 resetAdminSecurity */
export const resetAdminPassword = (data: {
  email: string
  email_code: string
  new_password: string
}) => resetAdminSecurity({ ...data, target: 'password' })

export const loginWithPasskey = (data: {
  ceremony_id: string
  credential: PasskeyCredentialPayload
  device_id: string
}) => unwrap<AdminSession>(client.post('/v1/admin/auth/login', { method: 'passkey', ...data }))

export const createPasskeyChallenge = (
  data: {
    device_id?: string
    purpose: PasskeyChallengePurpose
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
    verification_method: SecurityVerificationMethod
    email_code?: string
    current_password?: string
  }
) =>
  unwrap<string>(
    client.put('/v1/admin/security/passkey', data, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  )

export const bindAdminTotp = (
  accessToken: string,
  data: {
    verification_method: SecurityVerificationMethod
    email_code?: string
    current_password?: string
  }
) =>
  unwrap<{ key_url: string }>(
    client.put('/v1/admin/security/totp', data, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  )

export const deleteAdminTotp = (
  accessToken: string,
  data: {
    verification_method: SecurityVerificationMethod
    email_code?: string
    current_password?: string
  }
) =>
  unwrap<string>(
    client.delete('/v1/admin/security/totp', {
      data,
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  )

export const deleteAdminPasskey = (
  accessToken: string,
  data: {
    verification_method: SecurityVerificationMethod
    email_code?: string
    current_password?: string
  }
) =>
  unwrap<string>(
    client.delete('/v1/admin/security/passkey', {
      data,
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
