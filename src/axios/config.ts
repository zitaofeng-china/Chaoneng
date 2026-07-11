import { AxiosResponse, InternalAxiosRequestConfig } from './types'
import { ElMessage } from 'element-plus'
import qs from 'qs'
import { SUCCESS_CODE, TRANSFORM_REQUEST_DATA } from '@/constants'
import { useUserStoreWithOut } from '@/store/modules/user'
import { objToFormData } from '@/utils'

/** 登录失效业务码（后端可能返回 number 或 string） */
const AUTH_EXPIRED_CODE = '400002'

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
  if (response?.config?.responseType === 'blob') {
    // 如果是文件流，直接过
    return response
  } else if (response.data.code === SUCCESS_CODE) {
    return response.data
  } else {
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
    if (String(response?.data?.code ?? '') === AUTH_EXPIRED_CODE) {
      const userStore = useUserStoreWithOut()
      userStore.logout()
    }
    return Promise.reject(response?.data)
  }
}

export { defaultResponseInterceptors, defaultRequestInterceptors }
