import request from '@/axios'
import type {
  AdBannerListParams,
  AdBannerListResponse,
  AdBannerPublicListResponse,
  AdBannerItem,
  SaveAdBannerParams
} from './types'

export * from './types'

const ADMIN_BASE_URL = '/v1/ad'
const PUBLIC_BASE_URL = '/v3/ad'

export const getAdBannerList = (
  params: AdBannerListParams = {}
): Promise<IResponse<AdBannerListResponse>> => {
  return request.get({
    url: ADMIN_BASE_URL,
    params
  })
}

export const getAdBannerDetail = (id: number): Promise<IResponse<AdBannerItem>> => {
  return request.get({
    url: `${ADMIN_BASE_URL}/${id}`
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

/** H5 端使用的广告列表接口。 */
export const getPublicAdBannerList = (): Promise<IResponse<AdBannerPublicListResponse>> => {
  return request.get({
    url: PUBLIC_BASE_URL
  })
}
