import { AxiosResponse, InternalAxiosRequestConfig } from './types'
import { ElMessage } from 'element-plus'
import qs from 'qs'
import { SUCCESS_CODE, TRANSFORM_REQUEST_DATA } from '@/constants'
import { expireAdminSession } from '@/store/modules/adminAuth'
import { objToFormData } from '@/utils'

/** 登录失效业务码（后端可能返回 number 或 string） */
export const AUTH_EXPIRED_CODE = '400002'

/** 敏感操作需要增强认证。HTTP 仍可能是 200，必须看业务码。 */
export const ELEVATE_REQUIRED_CODE = '000008'

export const isAuthExpiredCode = (code: unknown) => String(code ?? '') === AUTH_EXPIRED_CODE

export const isElevateRequiredCode = (code: unknown) => String(code ?? '') === ELEVATE_REQUIRED_CODE

const defaultRequestInterceptors = (config: InternalAxiosRequestConfig) => {
  if (
    config.method === 'post' &&
    config.headers['Content-Type'] === 'application/x-www-form-urlencoded'
  ) {
    config.data = qs.stringify(config.data)
  } else if (
    TRANSFORM_REQUEST_DATA &&
    config.method === 'post' &&
    config.headers['Content-Type'] === 'multipart/form-data' &&
    !(config.data instanceof FormData)
  ) {
    config.data = objToFormData(config.data)
  }
  if (config.method === 'get' && config.params) {
    let url = config.url as string
    const query = qs.stringify(config.params, { arrayFormat: 'repeat', skipNulls: true })
    if (query) {
      url += `${url.includes('?') ? '&' : '?'}${query}`
    }
    config.params = {}
    config.url = url
  }
  return config
}

const defaultResponseInterceptors = (response: AxiosResponse) => {
  const raw = response as AxiosResponse & { code?: string; config?: unknown }
  // 401 刷新重试后，前一个拦截器可能已经解包成业务结果
  if (raw && !raw.config && raw.code != null) {
    return response
  }
  if (response?.config?.responseType === 'blob') {
    // 如果是文件流，直接过
    return response
  } else if (response.data.code === SUCCESS_CODE) {
    return response.data
  } else {
    // 000008 交给增强认证拦截器：不能 toast / reject，否则会丢掉原请求 config。
    const elevateConfig = response.config as {
      skipElevate?: boolean
      _adminElevateRetried?: boolean
    }
    if (
      isElevateRequiredCode(response?.data?.code) &&
      !elevateConfig?.skipElevate &&
      !elevateConfig?._adminElevateRetried
    ) {
      return response
    }
    if (isAuthExpiredCode(response?.data?.code)) {
      if ((response.config as any)?.skipAuthRefresh) {
        return Promise.reject(response?.data)
      }
      return expireAdminSession()
    }
    // 检查是否跳过错误处理
    const skipErrorHandler = (response.config as any)?.skipErrorHandler
    if (!skipErrorHandler) {
      const errorMsg = response?.data?.msg || '请求失败，请稍后重试'
      // 检查是否是重复错误，显示中文提示
      if (
        errorMsg.includes('Duplicate entry') ||
        errorMsg.includes('duplicate') ||
        errorMsg.includes('1062')
      ) {
        ElMessage.error('该数据已存在，请勿重复添加')
      } else {
        ElMessage.error(errorMsg)
      }
    }
    return Promise.reject(response?.data)
  }
}

export { defaultResponseInterceptors, defaultRequestInterceptors }
