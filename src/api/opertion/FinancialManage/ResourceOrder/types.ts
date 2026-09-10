/**
 * 资源订单（理财订单）相关类型定义
 * 接口：GET /v1/fund/order
 */

/**
 * 分页信息
 */
export interface V2Pager {
  current_page: number // 当前页码
  page_size: number // 每页数量
  total: number // 总数
}

/**
 * 资源订单列表查询参数
 * GET /v1/fund/order
 */
export interface V2ResourceOrderListParams {
  bot_id?: number // 机器人ID
  current_page?: number // 页码
  keyword?: string // 关键字
  kind?: number // 订单类型
  order?: string // 排序，单字段：column [ASC|DESC]
  pay_method?: number // payment method (1=balance, 2=wallet; energy orders only)
  page_size?: number // 每页大小
  status?: number // 状态
  user_id?: number // 用户ID
}

/**
 * 资源订单项（理财订单）
 */
export interface V2ResourceOrderItem {
  id: number // 订单ID
  created_at: number // 创建时间（Unix时间戳-秒）
  updated_at: number // 更新时间（Unix时间戳-秒）
  user_id: number // 用户ID
  bot_id: number // 机器人ID
  status: number // 订单状态：2=进行中
  kind: number // 订单类型：7=快速能量等
  source: string // 来源地址
  target: string // 目标地址
  receiver: string // 接收地址
  balance: number // 余额（sun）
  amount: number // 数量
  offset_price: number // 价格浮动
  paid_at: number // 支付时间（Unix时间戳-秒）
  recycled_at: number | null // 回收时间（Unix时间戳-秒）
  settled_at: number // 结算时间（Unix时间戳-秒）
  profit_sum: string // 累计利润
  bot_name: string // 机器人名称
  agent_name: string // 代理名称
  describe: string // 备注
}

/**
 * 更新理财订单参数
 * PUT /v1/fund/order
 */
export interface V2UpdateResourceOrderParams {
  id: number // 订单ID
  offset_price: number // 价格浮动
}

/**
 * 资源订单详情响应
 * GET /v1/fund/order/{id}
 */
export type V2ResourceOrderDetail = V2ResourceOrderItem

/**
 * 资源订单列表响应
 */
export interface V2ResourceOrderListResponse {
  list: V2ResourceOrderItem[] // 订单列表
  pager: V2Pager // 分页信息
}

/**
 * 结算记录列表查询参数
 * GET /v1/fund/settlement
 */
export interface V2SettlementRecordListParams {
  current_page?: number // 页码
  page_size?: number // 每页大小
  keyword?: string // 关键字（订单ID/代理/机器人等）
  /** 交易哈希，与列表字段 txid 一致 */
  txid?: string
  order?: string // 排序
  order_id?: number // 订单ID
  /** 结算状态：0=确认中，1=成功，2=失败 */
  status?: number
  start_time?: string
  end_time?: string
}

/**
 * 结算记录项
 */
export interface V2SettlementRecordItem {
  created_at: number // 创建时间（Unix时间戳-秒）
  order_id: number // 订单ID
  period: string // 结算周期（如：2026-05-19）
  amount: number // 数量
  price: number // 单价
  duration: number // 时长
  profit: string // 利润
  status: number // 状态：0=确认中，1=成功，2=失败
  txid: string // 交易哈希
  describe: string // 描述
}

/**
 * 结算记录列表响应
 */
export interface V2SettlementRecordListResponse {
  list: V2SettlementRecordItem[] // 结算记录列表
  pager: V2Pager // 分页信息
}
