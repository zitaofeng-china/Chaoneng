import request from '@/axios'

export interface V2ResourceDetailItem {
  id: number
  order_id: string
  code: number
  amount: number
  balance: number
  source: string
  target: string
  agent_name: string
  bot_name: string
  delegated_at: string | null
  delegated_txid: string | null
  expirated_at: string | null
  recycled_at: string | null
  recycled_txid: string | null
  used_txid: string | null
  created_at: string
  updated_at: string
}

export interface V2ResourceDetailListParams extends PageParam {
  keyword?: string
  order?: string
  order_id?: string
  source?: string
  status?: 1 | 2
  target?: string
}

export interface V2ResourceDetailListResponse {
  list: V2ResourceDetailItem[]
  pager: {
    total: number
    current_page: number
    page_size: number
  }
}

export const v2GetResourceDetailList = (
  params: V2ResourceDetailListParams
): Promise<IResponse<V2ResourceDetailListResponse>> => {
  return request.get({
    url: '/v2/system/resource',
    params
  })
}
