import request from '@/axios'
import type {
  V2AddressListParams,
  V2AddressListResponse,
  V2CreateAddressParams,
  V2UpdateAddressParams,
  V2DeleteAddressParams,
  V2UnboundAgentsResponse
} from './trx_address_types'

// --- Base URL updated to v2 ---

/**
 * 获取TRX地址列表 - 新接口
 */
const JIU_BASE_URL = '/v2/address'
const NEW_BASE_URL = '/v1/address'
export const v2GetAddressList = (
  params: V2AddressListParams
): Promise<IResponse<V2AddressListResponse>> => {
  return request.get({
    url: `${NEW_BASE_URL}`,
    params
  })
}

/**
 * 创建TRX地址 - 新接口
 */
export const v2CreateAddress = (data: V2CreateAddressParams): Promise<IResponse> => {
  return request.post({
    url: `${NEW_BASE_URL}`,
    data,
    // 添加配置，跳过拦截器的错误提示
    skipErrorHandler: true
  } as any)
}

/**
 * 更新地址 - 绑定/解绑接口
 */
export const v2UpdateAddress = (data: V2UpdateAddressParams): Promise<IResponse> => {
  return request.put({
    url: `${NEW_BASE_URL}`,
    data
  })
}

/**
 * 删除地址 - 新接口
 */
export const v2DeleteAddress = (data: V2DeleteAddressParams): Promise<IResponse> => {
  return request.delete({
    url: `${JIU_BASE_URL}`,
    data
  })
}

/**
 * 获取未绑定的代理列表 - 新接口
 */
export const v2GetUnboundAgents = (): Promise<IResponse<V2UnboundAgentsResponse>> => {
  return request.get({
    url: `${JIU_BASE_URL}/unbound_agents`
  })
}

/**
 * 批量导入TRX地址 - 新接口
 */
export const v2BatchImportAddress = (formData: FormData): Promise<IResponse> => {
  return request.post({
    url: `${NEW_BASE_URL}/import`,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 导出模版 - 新接口
 */
export const v2ExportAddressModule = () => {
  return request.get({
    url: `${NEW_BASE_URL}/module`,
    responseType: 'blob'
  })
}
