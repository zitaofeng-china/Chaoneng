import axios, { AxiosError } from 'axios'
import { defaultRequestInterceptors, defaultResponseInterceptors } from './config'
import { AxiosInstance, InternalAxiosRequestConfig, RequestConfig, AxiosResponse } from './types'
import { ElMessage } from 'element-plus'
import { REQUEST_TIMEOUT } from '@/constants'
import qs from 'qs'

export const PATH_URL =
  (window as any).APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_PATH

type PendingRequest = {
  controller: AbortController
  method: string
  url: string
}

const pendingRequests = new Map<string, PendingRequest>()
let requestSeq = 0

// 请求唯一 key 挂在 config 上，不要写成 HTTP 头（避免跨域预检失败）
const REQUEST_KEY = '__requestKey'

const buildRequestKey = (method: string, url: string) => {
  requestSeq += 1
  return `${method.toUpperCase()} ${url}#${requestSeq}`
}

const getRequestKey = (config?: { [key: string]: any } | null) => {
  if (!config) return ''
  return String(config[REQUEST_KEY] || '')
}

const clearPending = (config?: { [key: string]: any } | null) => {
  const requestKey = getRequestKey(config)
  if (requestKey) {
    pendingRequests.delete(requestKey)
  }
}

const isCanceledError = (error: AxiosError) => {
  return (
    axios.isCancel(error) ||
    error.code === 'ERR_CANCELED' ||
    error.name === 'CanceledError' ||
    error.name === 'AbortError'
  )
}

const axiosInstance: AxiosInstance = axios.create({
  timeout: REQUEST_TIMEOUT,
  baseURL: PATH_URL,
  paramsSerializer: {
    serialize: (params) => {
      return qs.stringify(params, { arrayFormat: 'repeat' })
    }
  }
})

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const controller = new AbortController()
  const originalUrl = config.url || ''

  // --- Mock 逻辑判断 ---
  const MOCK_LIST = (import.meta.env.VITE_MOCK_LIST || '').split(',')
  const useMock = import.meta.env.VITE_USE_MOCK === 'true'
  const isMockRequest = useMock && MOCK_LIST.some((item) => item && originalUrl.includes(item))

  if (isMockRequest) {
    config.url = '/mock' + originalUrl
    config.baseURL = ''
  } else {
    const systemType = import.meta.env.VITE_SYSTEM_TYPE
    const prefix = systemType === 'Management' ? '/v1' : '/v2'
    const currentUrl = config.url || ''

    if (
      !currentUrl.includes('/public') &&
      !currentUrl.startsWith('/v1') &&
      !currentUrl.startsWith('/v2')
    ) {
      config.url = `${prefix}${currentUrl}`
    }
  }

  const method = (config.method || 'get').toUpperCase()
  const finalUrl = config.url || ''
  const requestKey = buildRequestKey(method, finalUrl)

  config.signal = controller.signal
  ;(config as any)[REQUEST_KEY] = requestKey
  pendingRequests.set(requestKey, { controller, method, url: finalUrl })

  return config
})

axiosInstance.interceptors.response.use(
  (res: AxiosResponse) => {
    clearPending(res.config as any)
    return res
  },
  (error: AxiosError) => {
    clearPending(error.config as any)

    // 主动取消：静默
    if (isCanceledError(error)) {
      return Promise.reject(error)
    }

    // HTTP 4xx/5xx：协议层提示（业务码错误走 success 分支的 defaultResponseInterceptors）
    if (error.response) {
      const skipErrorHandler = (error.config as any)?.skipErrorHandler
      if (!skipErrorHandler) {
        const status = error.response.status
        const data: any = error.response.data
        const msg =
          (typeof data === 'object' && data && (data.msg || data.message)) ||
          (status >= 500 ? '服务异常，请稍后重试' : `请求失败（${status}）`)
        ElMessage.error(String(msg))
      }
      return Promise.reject(error)
    }

    // 纯网络层：超时 / 断网
    if (error.code === 'ECONNABORTED' || String(error.message || '').includes('timeout')) {
      ElMessage.error('请求超时，请稍后重试')
    } else {
      ElMessage.error('网络错误，稍后重试')
    }
    return Promise.reject(error)
  }
)

axiosInstance.interceptors.request.use(defaultRequestInterceptors)
axiosInstance.interceptors.response.use(defaultResponseInterceptors)

const matchesCancelTarget = (pendingUrl: string, target: string) => {
  if (!target) return false
  // 兼容旧调用：传 path 或带版本前缀的 url
  return (
    pendingUrl === target ||
    pendingUrl.endsWith(target) ||
    pendingUrl.includes(target) ||
    target.endsWith(pendingUrl)
  )
}

const service = {
  request: <T = any>(config: RequestConfig): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (config.interceptors?.requestInterceptors) {
        config = config.interceptors.requestInterceptors(config as InternalAxiosRequestConfig)
      }

      axiosInstance
        .request<any, T>(config)
        .then((res) => {
          resolve(res)
        })
        .catch((err: any) => {
          reject(err)
        })
    })
  },
  cancelRequest: (url: string | string[]) => {
    const urlList = Array.isArray(url) ? url : [url]
    for (const [key, pending] of [...pendingRequests.entries()]) {
      if (urlList.some((target) => matchesCancelTarget(pending.url, target))) {
        pending.controller.abort()
        pendingRequests.delete(key)
      }
    }
  },
  cancelAllRequest() {
    for (const [, pending] of pendingRequests) {
      pending.controller.abort()
    }
    pendingRequests.clear()
  }
}

export { axiosInstance }
export default service
