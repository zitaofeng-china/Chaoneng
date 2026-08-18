import request from '@/axios'
import type {
  V2AddressListParams,
  V2AddressListResponse,
  V2CreateAddressParams,
  V2UpdateAddressParams,
  V2DeleteAddressParams
} from './trx_address_types'

export * from './trx_address_types'

const ADDRESS_V1_BASE_URL = '/v1/address'

/**
 * 获取TRX地址列表
 */
export const v2GetAddressList = (
  params: V2AddressListParams
): Promise<IResponse<V2AddressListResponse>> => {
  return request.get({
    url: ADDRESS_V1_BASE_URL,
    params
  })
}

/**
 * 创建TRX地址
 */
export const v2CreateAddress = (data: V2CreateAddressParams): Promise<IResponse> => {
  return request.post({
    url: ADDRESS_V1_BASE_URL,
    data,
    skipErrorHandler: true
  })
}

/**
 * 更新地址 - 绑定/解绑接口
 */
export const v2UpdateAddress = (data: V2UpdateAddressParams): Promise<IResponse> => {
  return request.put({
    url: ADDRESS_V1_BASE_URL,
    data
  })
}

/**
 * 删除地址
 */
export const v2DeleteAddress = (data: V2DeleteAddressParams): Promise<IResponse> => {
  return request.delete({
    url: ADDRESS_V1_BASE_URL,
    data
  })
}
