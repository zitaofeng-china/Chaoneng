export interface AdBannerPager {
  current_page: number
  page_size: number
  total: number
}

export interface AdBannerItem {
  id: number
  created_at?: number | string
  image_url: string
  link_url: string
  sort: number | string
  status: number | string
  title: string
  updated_at?: number | string
}

export interface AdBannerListParams {
  current_page?: number | string
  keyword?: string
  order?: string
  page_size?: number | string
  status?: number | string
  title?: string
  sort?: string
}

export interface AdBannerListResponse {
  list: AdBannerItem[]
  pager?: AdBannerPager
}

export interface AdBannerPublicListResponse {
  list: AdBannerItem[]
}

export interface SaveAdBannerParams {
  id?: number
  image_url: string
  link_url: string
  sort: number
  status: number
  title: string
}
