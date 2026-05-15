/**
 * 资源订单相关类型定义
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
 */
export interface V2ResourceOrderListParams {
  current_page?: number // 当前页码
  page_size?: number // 每页数量，-1表示获取所有数据
  keyword?: string // 关键字（订单号/代理名称/目标地址）
  resource_type?: number // 资源类型：1-能量出售，2-带宽出售
  status?: number // 订单状态：1-全部回收，2-进行中，3-提前回收，4-部分回收停止计费
  bot_id?: number // 机器人ID
}

/**
 * 资源订单项
 */
export interface V2ResourceOrderItem {
  id: string // 订单号
  agent_id: number // 代理ID
  agent_name: string // 代理名称
  bot_id: number // 机器人ID
  bot_user_name: string // 机器人用户名
  send_address: string // 用户发送地址
  receive_address: string // 接收地址（用户接收地址）
  system_receive_address?: string // 系统接收地址
  recycle_hash_1?: string // 回收哈希1
  recycle_hash_2?: string // 回收哈希2
  resource_type: number // 资源类型：1-能量出售，2-带宽出售
  amount: number // 数量
  unit_price: number // 单价(sun/天)
  total_duration: number // 总时长（天）
  status: number // 订单状态：1-全部回收，2-进行中，3-提前回收，4-部分回收停止计费
  remark?: string // 备注
  start_time: number // 开始时间（Unix时间戳-秒）
  end_time?: number // 结束时间（Unix时间戳-秒）
}

/**
 * 资源订单列表响应
 */
export interface V2ResourceOrderListResponse {
  list: V2ResourceOrderItem[] // 订单列表
  pager: V2Pager // 分页信息
}

/**
 * 资源订单详情
 */
export type V2ResourceOrderDetail = V2ResourceOrderItem

/**
 * 结算记录列表查询参数
 */
export interface V2SettlementRecordListParams {
  order_id: string // 订单ID
  current_page?: number // 当前页码
  page_size?: number // 每页数量
}

/**
 * 结算记录项
 */
export interface V2SettlementRecordItem {
  id: string // 结算记录ID/结算批次
  order_id: string // 订单ID
  settlement_date: number // 结算日期（Unix时间戳-秒）
  settlement_period: string // 结算周期（如：按日结算、每天结算一次）
  payable_amount: number // 应付金额（TRX）
  paid_amount: number // 实付金额（TRX）
  settlement_status: number // 结算状态原始值：1-待结算，2-已结算，3-结算失败；前端统一展示为成功/失败
  settlement_time?: number // 结算时间（Unix时间戳-秒）
  transaction_hash?: string // 交易哈希
  remark?: string // 备注
  created_at: number // 创建时间（Unix时间戳-秒）
}

/**
 * 结算记录列表响应
 */
export interface V2SettlementRecordListResponse {
  list: V2SettlementRecordItem[] // 结算记录列表
  pager: V2Pager // 分页信息
}
