// ========== 新接口 v2 类型定义 ==========

/**
 * 分页信息
 */
export interface Pager {
  current_page: number // 当前页码
  page_size: number // 每页数量
  total: number // 总数量
}

/**
 * 托管列表查询参数 - 新接口 v2
 */
export interface HostingListParamsV2 {
  address?: string // 地址
  agent_id?: number // 代理ID
  bot_id?: number // 机器人ID
  current_page?: number // 当前页码
  keyword?: string // 关键字
  page_size?: number // 每页大小
  user_id?: number // 用户ID
  source?: string // 来源 (H5/机器人)
  origin?: number // 来源（1=机器人，2=H5）
  kind?: number // 托管类型（20=托管，21=托管速充）
  status?: number // 状态（1=启用，2=禁用）
  order?: string // 排序参数（例如：created_at ASC）
}

/**
 * 托管列表项 - 新接口 v2
 */
export interface HostingItemV2 {
  address: string // 托管地址
  agent_id: number // 代理ID
  agent_name: string // 代理名称
  bot_id: number // 机器人ID
  bot_name: string // 机器人名称
  count?: number // 当日已用次数
  created_at: number | string // 创建时间（Unix 时间戳或日期字符串）
  email?: string // 用户邮箱
  id: number // 托管ID
  order_id: string // 订单ID
  updated_at: number | string // 更新时间（Unix 时间戳或日期字符串）
  user_id: number // 用户ID
  tg_user_name: string // 用户名
  username?: string // 用户账号
  origin?: number // 来源（1=机器人，2=H5）
  kind?: number // 托管类型（20=托管，21=托管速充）
  status?: number // 状态（1=启用，2=禁用）
  minimum?: number | string // 最小值
  maximum?: number | string // 最大值
  threshold?: number // 阈值
  today_count?: number // 今日使用次数
  total?: number // 总次数
}

/**
 * 托管列表响应 - 新接口 v2
 */
export interface HostingListResponseV2 {
  list: HostingItemV2[] // 托管列表
  pager: Pager // 分页信息
}

/**
 * 删除托管地址请求参数 - 新接口 v2
 */
export interface RemoveHostingParamsV2 {
  address: string // 托管地址（必填）
}

/**
 * 回收与重置请求参数 - 新接口 v2
 */
export interface RecycleOrderParamsV2 {
  address: string // 地址（必填）
}
