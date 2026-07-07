export interface AddressBlacklistPager {
  current_page: number
  page_size: number
  total: number
}

export interface AddressBlacklistListParams {
  current_page?: number
  page_size?: number
  address?: string
  scope?: number | string | Array<number | string>
  status?: number | string
  order?: string
}

export interface AddressBlacklistItem {
  id: number
  address: string
  agent_id?: number
  agent_name?: string
  scopes?: number[] | string
  status: number | string
  created_by?: string
  operator?: string
  created_at?: number | string
  updated_at?: number | string
  describe?: string
}

export interface AddressBlacklistListResponse {
  list: AddressBlacklistItem[]
  pager: AddressBlacklistPager
}

export interface SaveAddressBlacklistParams {
  id?: number
  address: string
  agent_id?: number
  scopes: number[]
  status: number
  describe?: string
}

export interface DeleteAddressBlacklistParams {
  id?: number
  address?: string
}
