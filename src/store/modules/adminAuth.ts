import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { store } from '../index'
import { refreshAdminSession, logoutAdminSession } from '@/auth/admin/api'
import { parseUnixSeconds, type AdminSession } from '@/auth/admin/types'

let sessionExpireLock = false

/** 会话已失效并正在跳转登录页时，挂起原请求，避免页面再弹接口错误。 */
export const pendingAuthRedirect = () => new Promise<never>(() => {})

/** 静默结束会话：只提示一次登录过期，不把业务接口错误抛给页面。 */
export const expireAdminSession = () => {
  if (sessionExpireLock) return pendingAuthRedirect()
  sessionExpireLock = true
  useAdminAuthStore(store).clearSession()
  ElMessage.warning('登录已过期，请重新登录')
  void import('@/store/modules/user').then(({ useUserStoreWithOut }) => {
    useUserStoreWithOut().reset()
  })
  return pendingAuthRedirect()
}

type AdminAuthState = {
  accessExpiresAt?: number
  accessToken: string
  initialized: boolean
  refreshExpiresAt?: number
}

type AuthMessage = { type: 'session'; session: AdminSession } | { type: 'logout' }

/** 在 access_expires_at 前这么久开始换新 Access Token。 */
const ACCESS_REFRESH_LEAD_MS = 60_000
const MIN_REFRESH_DELAY_MS = 1_000
const RETRY_REFRESH_DELAY_MS = 10_000
const MAX_TIMEOUT_MS = 2_147_483_647

let refreshPromise: Promise<AdminSession> | undefined
let lastRemoteRefreshAt = 0
let refreshTimer: number | undefined
const channel =
  typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel('admin-auth')

const withRefreshLock = async <T>(callback: () => Promise<T>) => {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks
  return locks ? locks.request('admin-auth-refresh', { mode: 'exclusive' }, callback) : callback()
}

const clearAccessTokenRefreshTimer = () => {
  if (refreshTimer == null) return
  window.clearTimeout(refreshTimer)
  refreshTimer = undefined
}

const computeRefreshDelay = (accessExpiresAt?: number) => {
  if (!accessExpiresAt) return undefined
  const remaining = accessExpiresAt * 1000 - Date.now()
  if (remaining <= 0) return MIN_REFRESH_DELAY_MS
  const delay =
    remaining > ACCESS_REFRESH_LEAD_MS * 2
      ? remaining - ACCESS_REFRESH_LEAD_MS
      : Math.max(MIN_REFRESH_DELAY_MS, Math.floor(remaining / 2))
  return Math.min(MAX_TIMEOUT_MS, delay)
}

const logoutAfterExpiry = () => {
  expireAdminSession()
}

const runScheduledRefresh = async () => {
  const authStore = useAdminAuthStore(store)
  if (!authStore.accessToken) return
  if (authStore.isRefreshExpired()) {
    logoutAfterExpiry()
    return
  }
  try {
    await authStore.refreshSession()
  } catch {
    if (!authStore.accessExpiresAt || Date.now() >= authStore.accessExpiresAt * 1000) {
      logoutAfterExpiry()
      return
    }
    refreshTimer = window.setTimeout(() => {
      void runScheduledRefresh()
    }, RETRY_REFRESH_DELAY_MS)
  }
}

const scheduleAccessTokenRefresh = () => {
  clearAccessTokenRefreshTimer()
  if (typeof window === 'undefined') return
  const authStore = useAdminAuthStore(store)
  if (!authStore.accessToken || authStore.isRefreshExpired()) return
  const delay = computeRefreshDelay(authStore.accessExpiresAt)
  if (delay == null) return
  refreshTimer = window.setTimeout(() => {
    void runScheduledRefresh()
  }, delay)
}

export const useAdminAuthStore = defineStore('adminAuth', {
  state: (): AdminAuthState => ({
    accessExpiresAt: undefined,
    accessToken: '',
    initialized: false,
    refreshExpiresAt: undefined
  }),
  getters: {
    getAccessToken: (state) => state.accessToken,
    getInitialized: (state) => state.initialized,
    isAuthenticated: (state) => Boolean(state.accessToken)
  },
  actions: {
    isRefreshExpired() {
      return Boolean(this.refreshExpiresAt && Date.now() >= this.refreshExpiresAt * 1000)
    },
    shouldRefreshAccessToken() {
      return Boolean(
        this.accessToken &&
          this.accessExpiresAt &&
          Date.now() >= this.accessExpiresAt * 1000 - ACCESS_REFRESH_LEAD_MS
      )
    },
    applySession(session: AdminSession, broadcast = true) {
      sessionExpireLock = false
      this.accessToken = session.access_token
      this.accessExpiresAt = parseUnixSeconds(session.access_expires_at)
      this.refreshExpiresAt = parseUnixSeconds(session.refresh_expires_at)
      this.initialized = true
      if (broadcast) channel?.postMessage({ type: 'session', session } satisfies AuthMessage)
      scheduleAccessTokenRefresh()
    },
    clearSession(broadcast = true) {
      clearAccessTokenRefreshTimer()
      this.accessToken = ''
      this.accessExpiresAt = undefined
      this.refreshExpiresAt = undefined
      this.initialized = true
      if (broadcast) channel?.postMessage({ type: 'logout' } satisfies AuthMessage)
    },
    currentSession(): AdminSession {
      return {
        access_expires_at: this.accessExpiresAt || 0,
        access_token: this.accessToken,
        refresh_expires_at: this.refreshExpiresAt || 0,
        token_type: 'Bearer'
      }
    },
    async refreshSession() {
      if (!refreshPromise) {
        refreshPromise = withRefreshLock(async () => {
          if (Date.now() - lastRemoteRefreshAt < 1000 && this.accessToken) {
            return this.currentSession()
          }
          const session = await refreshAdminSession()
          lastRemoteRefreshAt = Date.now()
          this.applySession(session)
          return session
        }).finally(() => {
          refreshPromise = undefined
        })
      }
      return refreshPromise
    },
    /** 按 access_expires_at 在过期前换新 AT；Refresh 已过期或 AT 已失效且刷新失败时返回 false。 */
    async ensureFreshAccessToken() {
      if (!this.accessToken) return false
      if (this.isRefreshExpired()) {
        this.clearSession()
        return false
      }
      if (!this.shouldRefreshAccessToken()) return true
      try {
        await this.refreshSession()
        return Boolean(this.accessToken)
      } catch {
        if (this.accessExpiresAt && Date.now() >= this.accessExpiresAt * 1000) {
          this.clearSession()
          return false
        }
        return Boolean(this.accessToken)
      }
    },
    async restoreSession() {
      if (this.initialized) return this.isAuthenticated
      try {
        await this.refreshSession()
        return true
      } catch {
        this.clearSession(false)
        return false
      }
    },
    async logout(scope: 'current' | 'all' = 'current') {
      try {
        if (this.accessToken) await logoutAdminSession(this.accessToken, scope)
      } finally {
        this.clearSession()
      }
    }
  }
})

channel?.addEventListener('message', (event: MessageEvent<AuthMessage>) => {
  const authStore = useAdminAuthStore(store)
  if (event.data.type === 'session') {
    lastRemoteRefreshAt = Date.now()
    authStore.applySession(event.data.session, false)
  } else if (event.data.type === 'logout') {
    authStore.clearSession(false)
  }
})

const resumeAdminSession = () => {
  const authStore = useAdminAuthStore(store)
  if (!authStore.accessToken) return
  if (authStore.isRefreshExpired()) {
    logoutAfterExpiry()
    return
  }
  if (authStore.shouldRefreshAccessToken()) {
    void runScheduledRefresh()
    return
  }
  scheduleAccessTokenRefresh()
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resumeAdminSession()
  })
  window.addEventListener('focus', resumeAdminSession)
  window.addEventListener('pageshow', resumeAdminSession)
  window.addEventListener('online', resumeAdminSession)
}

export const useAdminAuthStoreWithOut = () => useAdminAuthStore(store)
