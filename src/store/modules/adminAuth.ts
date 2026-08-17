import { defineStore } from 'pinia'
import { store } from '../index'
import { refreshAdminSession, logoutAdminSession } from '@/auth/admin/api'
import type { AdminSession } from '@/auth/admin/types'

type AdminAuthState = {
  accessExpiresAt?: string
  accessToken: string
  initialized: boolean
  refreshExpiresAt?: string
}

type AuthMessage = { type: 'session'; session: AdminSession } | { type: 'logout' }

let refreshPromise: Promise<AdminSession> | undefined
let lastRemoteRefreshAt = 0
const channel =
  typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel('admin-auth')

const withRefreshLock = async <T>(callback: () => Promise<T>) => {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks
  return locks ? locks.request('admin-auth-refresh', { mode: 'exclusive' }, callback) : callback()
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
    applySession(session: AdminSession, broadcast = true) {
      this.accessToken = session.access_token
      this.accessExpiresAt = session.access_expires_at
      this.refreshExpiresAt = session.refresh_expires_at
      this.initialized = true
      if (broadcast) channel?.postMessage({ type: 'session', session } satisfies AuthMessage)
    },
    clearSession(broadcast = true) {
      this.accessToken = ''
      this.accessExpiresAt = undefined
      this.refreshExpiresAt = undefined
      this.initialized = true
      if (broadcast) channel?.postMessage({ type: 'logout' } satisfies AuthMessage)
    },
    async refreshSession() {
      if (!refreshPromise) {
        refreshPromise = withRefreshLock(async () => {
          if (Date.now() - lastRemoteRefreshAt < 1000 && this.accessToken) {
            return {
              access_expires_at: this.accessExpiresAt || '',
              access_token: this.accessToken,
              refresh_expires_at: this.refreshExpiresAt || '',
              token_type: 'Bearer'
            }
          }
          const session = await refreshAdminSession()
          this.applySession(session)
          return session
        }).finally(() => {
          refreshPromise = undefined
        })
      }
      return refreshPromise
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

export const useAdminAuthStoreWithOut = () => useAdminAuthStore(store)
