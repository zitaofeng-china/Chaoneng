import request from '@/axios'
import type {
  CustomerServiceItem,
  CustomerServiceQueryParams,
  CustomerServiceListResponse,
  CreateCustomerServiceParams,
  UpdateCustomerServiceParams,
  DeleteCustomerServiceParams
} from './type'

export type {
  CustomerServiceItem,
  CustomerServiceQueryParams,
  CustomerServiceListResponse,
  CreateCustomerServiceParams,
  UpdateCustomerServiceParams,
  DeleteCustomerServiceParams
} from './type'

const CUSTOMER_SERVICE_BASE = '/v1/customer'

/**
 * 获取客服列表（代理端）
 * GET /v1/customer
 */
export const getUserCustomerServiceListApi = (
  params: CustomerServiceQueryParams
): Promise<IResponse<CustomerServiceListResponse>> => {
  return request.get({ url: CUSTOMER_SERVICE_BASE, params })
}

/**
 * 获取客服列表（运营端）
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

/**
 * 删除客服
 * DELETE /v1/customer
 */
export const deleteCustomerServiceApi = (data: DeleteCustomerServiceParams): Promise<IResponse> => {
  return request.delete({ url: CUSTOMER_SERVICE_BASE, data })
}
