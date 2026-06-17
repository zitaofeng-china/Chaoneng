// ========== 托管列表类型定义 ==========

/**
 * 分页信息
 */
export interface Pager {
  current_page: number
  page_size: number
  total: number
}

/**
 * 托管列表查询参数 - v1
 */
export interface HostingListParamsV1 {
  address?: string
  agent_id?: number
  bot_id?: number
  current_page?: number
  keyword?: string
  page_size?: number
  user_id?: number
  origin?: number // 来源（1=机器人，2=H5）
  kind?: number // 托管类型（20=托管，21=托管速充）
  status?: number // 状态（1=启用，2=禁用）
  order?: string
}

/**
 * 托管列表项 - v1
 */
export interface HostingItemV1 {
  address: string
  agent_id: number
  agent_name: string
  bot_id: number
  bot_name: string
  count?: number
  created_at: number | string
  email?: string
  id: number
  kind?: number
  maximum?: number
  minimum?: number
  order_id: string
  origin?: number
  status?: number
  threshold?: number
  tg_user_name: string
  today_count?: number
  total?: number
  updated_at: number | string
  user_id: number
  username?: string
}

/**
 * 托管列表响应 - v1
 */
export interface HostingListResponseV1 {
  list: HostingItemV1[]
  pager: Pager
}

/**
 * 删除托管地址请求参数
 */
export interface RemoveHostingParamsV1 {
  address: string
}
