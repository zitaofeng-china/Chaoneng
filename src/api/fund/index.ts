/**
 * 理财价格配置相关 API
 */
import request from '@/axios'
import type { FundPriceConfig, UpdateFundPriceConfigParams } from './types'

const BASE_URL = '/v1/fund'

export const getFundPriceConfig = (): Promise<IResponse<FundPriceConfig>> => {
  return request.get({
    url: `${BASE_URL}/config`
  })
}

export const updateFundPriceConfig = (
  data: UpdateFundPriceConfigParams
): Promise<IResponse<unknown>> => {
  return request.put({
    url: `${BASE_URL}/config`,
    data
  })
}
