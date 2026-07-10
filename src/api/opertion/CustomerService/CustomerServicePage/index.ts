import request from '@/axios'
import type {
  CustomerServiceItem,
  CustomerServiceQueryParams,
  CustomerServiceListResponse,
  CreateCustomerServiceParams,
  UpdateCustomerServiceParams
} from './type'

export type {
  CustomerServiceItem,
  CustomerServiceQueryParams,
  CustomerServiceListResponse,
  CreateCustomerServiceParams,
  UpdateCustomerServiceParams
} from './type'

const CUSTOMER_SERVICE_BASE = '/v1/customer'

/**
 * 获取客服列表
 * GET /v1/customer
 */
export const getCustomerServiceListApi = (
  params: CustomerServiceQueryParams
): Promise<IResponse<CustomerServiceListResponse>> => {
  return request.get({ url: CUSTOMER_SERVICE_BASE, params })
}

/**
 * 创建客服
 * POST /v1/customer
 */
export const createCustomerServiceApi = (data: CreateCustomerServiceParams): Promise<IResponse> => {
  return request.post({ url: CUSTOMER_SERVICE_BASE, data })
}

/**
 * 更新客服信息
 * PUT /v1/customer
 */
export const updateCustomerServiceApi = (data: UpdateCustomerServiceParams): Promise<IResponse> => {
  return request.put({ url: CUSTOMER_SERVICE_BASE, data })
}
