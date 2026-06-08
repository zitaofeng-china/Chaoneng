import request from '@/axios'

export interface TrxAddressBookItem {
  id: number
  agent_name: string
  receiving_address: string
  bot_name: string
  purpose: string
  trx_balance: number
  usdt_balance: number
}

export interface TrxAddressBookQueryParams extends PageParam {
  query?: string
}

export interface TrxAddressBookListResponse {
  list: TrxAddressBookItem[]
  pager: {
    total: number
    current_page: number
    page_size: number
  }
}

export const getTrxAddressBookListApi = (
  params: TrxAddressBookQueryParams
): Promise<IResponse<TrxAddressBookListResponse>> => {
  return request.get({
    url: '/market/trx_address_book/list',
    params
  })
}

export const exportTrxAddressBookApi = (
  params: TrxAddressBookQueryParams
): Promise<IResponse<Blob>> => {
  return request.get({
    url: '/market/trx_address_book/export',
    params,
    responseType: 'blob'
  })
}
