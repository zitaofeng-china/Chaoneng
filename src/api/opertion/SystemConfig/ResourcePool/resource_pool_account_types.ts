/**
 * 资源池列表查询参数
 * GET /v1/pool
 */
export interface PoolListParams {
  current_page?: number
  keyword?: string
  kind?: number
  order?: string
  page_size?: number
  status?: number
}

/**
 * 资源池列表项
 */
export interface PoolItem {
  id: number
  created_at: number
  updated_at: number
  address: string
  kind: number
  status: number
  amount: string
  bucket: string
  amount_threshold: string
  bucket_threshold: string
  permission_id: number
  permission_name: string
  created_by: string
  describe: string
}

export interface PoolPager {
  current_page: number
  page_size: number
  total: number
}

export interface PoolListResponse {
  list: PoolItem[]
  pager: PoolPager
}

/**
 * 创建资源池参数
 * POST /v1/pool
 */
export interface CreatePoolParams {
  address: string
  amount_threshold: number
  created_by: string
  kind: number
  permission_name: string
}

/**
 * 更新资源池参数
 * PUT /v1/pool
 */
export interface UpdatePoolParams {
  id: number
  amount_threshold?: number
  bucket_threshold?: number
  status?: number
}

/**
 * 资源池通知机器人
 * GET /v1/pool/notify
 */
export interface ResourcePoolNotifyData {
  agent_address_threshold: number
  broadcast_chat_id: number | string
  chat_id: number | string
  first_name: string
  id: number
  status: number
  token: string
  updated_at: string | number
  user_name: string
}

/**
 * 更新资源池通知机器人参数
 * PUT /v1/pool/notify
 */
export interface UpdateResourcePoolNotifyParams {
  agent_address_threshold?: number
  broadcast_chat_id: number
  chat_id: number
  first_name?: string
  id?: number
  status?: number
  token: string
  updated_at?: string | number
  user_name?: string
}

// 兼容现有页面命名，避免大范围联动修改
export type V2PoolListParams = PoolListParams
export type V2PoolItem = PoolItem
export type V2PoolListResponse = PoolListResponse
export type V2CreatePoolParams = CreatePoolParams
export type V2UpdatePoolParams = UpdatePoolParams
