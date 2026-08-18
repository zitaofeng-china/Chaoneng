import request from '@/axios'
import type { SiteDetail, UpdateSiteParams } from './types'

const BASE_URL = '/v1/site/'

/** GET /v1/site/{id} */
export const v1GetSiteDetail = (id: number | string): Promise<IResponse<SiteDetail>> => {
  return request.get({
    url: `${BASE_URL}${id}`
  })
}

/** PUT /v1/site */
export const v1UpdateSite = (data: UpdateSiteParams): Promise<IResponse> => {
  return request.put({
    url: BASE_URL.slice(0, -1), // 移除末尾的斜杠，变成 /v1/site
    data
  })
}
