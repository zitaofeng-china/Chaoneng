import request from '@/axios'
import type {
  V1PriceListParams,
  V1PriceListResponseData,
  V1UpdatePriceParams
} from './agent_price_types'

export * from './agent_price_types'

// ========== 代理价格配置接口 ==========

// GET /v1/price
export const v1GetPriceList = (
  params?: V1PriceListParams
): Promise<{ data: V1PriceListResponseData }> => {
  return request.get({
    url: '/v1/price',
    params
  })
}

// PUT /v1/price
export const v1UpdatePrice = (data: V1UpdatePriceParams): Promise<IResponse> => {
  return request.put({ url: `/v1/price`, data })
}
