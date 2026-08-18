import request from '@/axios'
import type { AdBannerListParams, AdBannerListResponse, SaveAdBannerParams } from './types'

export * from './types'

const ADMIN_BASE_URL = '/v1/ad'

export const getAdBannerList = (
  params: AdBannerListParams = {}
): Promise<IResponse<AdBannerListResponse>> => {
  return request.get({
    url: ADMIN_BASE_URL,
    params
  })
}

export const createAdBanner = (data: SaveAdBannerParams): Promise<IResponse> => {
  return request.post({
    url: ADMIN_BASE_URL,
    data
  })
}

export const updateAdBanner = (data: SaveAdBannerParams): Promise<IResponse> => {
  return request.put({
    url: ADMIN_BASE_URL,
    data
  })
}

export const deleteAdBanner = (id: number): Promise<IResponse> => {
  return request.delete({
    url: `${ADMIN_BASE_URL}/${id}`
  })
}
