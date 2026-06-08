import request from '@/axios'
import type { UpdateWelfareConfigParams, WelfareConfigData } from './types'

const BASE_URL = '/v1/weal'

export const getWelfareConfig = (): Promise<IResponse<WelfareConfigData>> => {
  return request.get({ url: BASE_URL })
}

export const updateWelfareConfig = (data: UpdateWelfareConfigParams): Promise<IResponse> => {
  return request.put({ url: BASE_URL, data })
}

export * from './types'
