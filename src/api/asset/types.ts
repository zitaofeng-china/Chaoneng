/**
 * 资产账户相关类型定义
 */

/** 创建资产账户请求参数 */
export interface CreateAssetAccountParams {
  address: string
  name: string
}

/** 获取资产余额报表请求参数 */
export interface GetAssetBalanceParams {
  start_time?: string
  end_time?: string
}

/** 单个账户余额快照 */
export interface AccountBalanceSnapshot {
  created_at: number
  name: string
  balance_trx: string
  balance_usdt: string
}

/** 当前余额汇总 */
export interface CurrentBalance {
  balance_trx: string
  balance_usdt: string
}

/** 资产余额报表响应数据 */
export interface AssetBalanceData {
  price_trx: string
  current: CurrentBalance
  history: Record<string, AccountBalanceSnapshot[]>
}
