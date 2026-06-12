/**
 * 资产账户相关类型定义
 */

/** 创建资产账户请求参数 */
export interface CreateAssetAccountParams {
  address: string
  name: string
}

/** 资产账户项 */
export interface AssetAccountItem {
  id: number
  address: string
  name: string
  created_at: number
  updated_at: number
}

/** 分页查询资产账户请求参数 */
export interface GetAssetAccountListParams {
  current_page?: number
  page_size?: number
  keyword?: string
  order?: string
}

/** 分页查询资产账户响应数据 */
export interface AssetAccountListData {
  list: AssetAccountItem[]
  pager: {
    current_page: number
    page_size: number
    total: number
  }
}

/** 删除资产账户请求参数 */
export interface DeleteAssetAccountParams {
  id?: string
  address?: string
}

/** 资产通知配置响应 */
export interface AssetNotifyData {
  chat_id: number
  interval: number
  token: string
}

/** 更新资产通知配置参数 */
export interface UpdateAssetNotifyParams {
  chat_id: number
  interval: number
  token: string
}

/** 单个账户余额快照 */
export interface AccountBalanceSnapshot {
  created_at: number
  name: string
  balance_trx: string
  balance_usdt: string
}

/** 当前余额（当天） */
export interface CurrentBalance {
  name: string
  balance_trx: string
  balance_usdt: string
}

/** 资产余额报表响应数据 */
export interface AssetBalanceData {
  price_trx: string
  current: CurrentBalance[]
  history: Record<string, AccountBalanceSnapshot[]>
}

/** 获取资产余额报表请求参数 */
export interface GetAssetBalanceParams {
  start_time?: string
  end_time?: string
}
