import axios from 'axios'
import type { AdminSession } from './types'

// 管理端认证必须经同源网关访问；Vite 开发代理会将 /api 转发到后端。
const baseURL = '/api'

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

export const refreshAdminSession = () => unwrap<AdminSession>(client.post('/v1/admin/auth/refresh'))

export const logoutAdminSession = (accessToken: string, scope: 'current' | 'all') =>
  unwrap<string>(
    client.post(
      '/v1/admin/auth/logout',
      { scope },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
  )

export const isAdminAuthPath = (url?: string) => Boolean(url?.includes('/v1/admin/auth/'))
