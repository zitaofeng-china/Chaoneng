// ========== 订单接口类型定义 ==========

/**
 * 能量交易订单查询参数
 */
export interface V2EnergyListParams {
  current_page?: number // 当前页码
  end_time?: string // 结束时间
  energy_address?: string // 能量地址
  keyword?: string // 关键字
  kind?: number | number[] // 类型: 4-时间能量, 5-笔数能量, 6-福利能量, 7-快速能量, 8-即用能量, 9-批量能量, 10-批量激活, 15-速充能量, 20-托管, 21-托管速充
  order_id?: string // 订单ID（字符串格式）
  order?: string // 排序参数，格式：字段名 ASC/DESC
  page_size?: number // 每页大小
  receive_address?: string // 接收地址
  start_time?: string // 开始时间
  status?: number // 状态: 1-新订单, 2-已支付, 3-已发送, 4-已回收, 5-已完成, 6-失败订单, 7-已退款, 8-已取消, 9-中止订单
  origin?: number // 来源: 1-机器人, 2-H5
  bot_id?: number // 机器人ID
}

/**
 * 能量交易订单列表项
 */
export interface V2EnergyItem {
  id: string // 订单ID
  created_at: number // 创建时间（Unix时间戳）
  updated_at: number // 更新时间（Unix时间戳）
  paid_at: number | null // 支付时间（Unix时间戳）
  kind: number // 类型: 1-代理充值, 2-用户充值, 3-兑换, 4-时间能量, 5-笔数能量, 6-福利能量, 7-快速能量, 8-即用能量, 9-批量能量, 10-批量激活, 11-机器人付费, 15-速充能量, 20-托管, 21-托管速充
  status: number // 状态: 1-新订单, 2-已支付, 3-已发送(已发送能量或兑换的TRX/USDT交易), 4-已回收(已发送回收能量或带宽的交易), 5-已完成(能量已被回收的), 6-失败订单, 7-已退款, 8-已取消(一般是超时自动取消), 9-中止订单(一般是代理余额不足)
  user_id: number // 用户ID
  agent_id: number // 代理ID
  bot_id: number // 机器人ID
  amount: string // 金额
  fee?: string | number // 手续费
  coin: string // 币种: TRX, USDT
  receive_address: string // 接收地址
  pay_id: string // 支付ID
  payment_address?: string // 支付地址/能量接收地址
  cost: string // 成本
  describe: string // 描述
  agent_name: string // 代理名称
  bot_name: string // 机器人名称
  bot_user_name?: string // 机器人用户名
  tg_user_name: string // TG用户名
  tg_first_name: string // TG名字
  energy_address: string // 能量地址
  energy_amount: string // 能量数量
  energy_count: number // 数量
  energy_actual_amount: string // 实际能量数量
  expirated_at: string | null // 过期时间（ISO时间格式字符串）
  delegated_at: string | null // 委托时间（ISO时间格式字符串）
  recycled_at: string | null // 回收时间（ISO时间格式字符串）
  username?: string // 用户账号
  email?: string // 用户邮箱
  origin?: number // 来源（1=机器人，2=H5）
}

/**
 * 分页信息
 */
export interface V2Pager {
  current_page: number // 当前页码
  page_size: number // 每页大小
  total: number // 总数
}

/**
 * 能量交易订单列表响应
 */
export interface V2EnergyListResponse {
  list: V2EnergyItem[] // 订单列表
  pager: V2Pager // 分页信息
}

/**
 * 订单详情汇总信息
 */
export interface V2OrderSummary {
  order_id: string // 订单ID
  gift_bandwidth: boolean // 是否赠送带宽
  duration?: number // 时长（秒）
  active_count: number // 激活数量
  energy_count: number // 数量
  used_count: number // 已使用数量
  fee?: string | number // 手续费
  cost?: string | number // 成本
  profit?: string | number // 利润
}

export type V2OrderDateTimeValue = string | number | null

/**
 * 订单资源详情
 */
export interface V2OrderResource {
  id: number // 资源ID
  created_at: V2OrderDateTimeValue // 创建时间
  updated_at: V2OrderDateTimeValue // 更新时间
  order_id: string // 订单ID
  amount: number // 数量
  target: string // 目标地址
  code: number // 状态码
  source: string // 来源地址
  balance: number // 余额
  expirated_at: V2OrderDateTimeValue // 过期时间
  used_txid: string // 使用交易ID
  actived_txid?: string // 激活交易ID
  actived_at?: V2OrderDateTimeValue // 激活时间
  delegated_txid: string // 委托交易ID
  delegated_at: V2OrderDateTimeValue // 委托时间
  recycled_txid: string // 回收交易ID
  recycled_at: V2OrderDateTimeValue // 回收时间
}

/**
 * 订单详情响应
 * data 对象包含所有订单字段 + summary + resources + exchange + transactions
 * 当前接口的激活信息主要挂在 resources[].actived_txid / resources[].actived_at 上
 * activations 字段保留为兼容历史页面的可选字段
 */
export interface V2OrderDetailResponse {
  id: string // 订单ID
  created_at: V2OrderDateTimeValue // 创建时间
  updated_at: V2OrderDateTimeValue // 更新时间
  paid_at: V2OrderDateTimeValue // 支付时间
  kind: number // 类型
  status: number // 状态
  user_id: number // 用户ID
  agent_id: number // 代理ID
  bot_id: number // 机器人ID
  amount: string | number | null // 金额
  coin: string // 币种
  receive_address: string // 接收地址
  pay_id: string // 支付ID
  cost: string | number | null // 成本
  fee?: string | number | null // 手续费
  describe: string // 描述
  agent_name: string // 代理名称
  bot_first_name: string // 机器人名字
  bot_user_name: string // 机器人用户名
  tg_user_name: string // TG用户名
  tg_first_name: string // TG名字
  summary: V2OrderSummary // 订单汇总信息
  resources: V2OrderResource[] // 订单资源列表
  activations?: V2OrderActivation[] // 激活记录列表（兼容旧页面）
  exchange?: V2OrderExchange // 兑换信息（可选，用于兑换类型订单）
  deliver_transaction?: V2Transaction // 发放交易信息（可选）
  pay_transaction?: V2Transaction // 支付交易信息（可选）
}

/**
 * 激活记录
 */
export interface V2OrderActivation {
  id: number // 激活记录ID
  order_id: string // 订单ID
  target: string // 目标地址
  actived_at: V2OrderDateTimeValue // 激活时间
  actived_txid: string // 激活交易ID
  created_at: V2OrderDateTimeValue // 创建时间
  updated_at: V2OrderDateTimeValue // 更新时间
}

/**
 * 兑换信息
 */
export interface V2OrderExchange {
  order_id: string // 订单ID
  in_coin: string // 输入币种
  in_amount: number // 输入金额
  in_address: string // 输入地址
  out_coin: string // 输出币种
  out_amount: number // 输出金额
  out_address: string // 输出地址
  out_at: string // 输出时间（ISO时间格式字符串）
  out_txid: string // 输出交易ID
  actual_rate: number // 实际汇率
  real_rate: number // 真实汇率
  agent_profit: number // 代理利润
  plate_profit: number // 平台利润
}

/**
 * 交易信息
 */
export interface V2Transaction {
  id: string // 交易ID
  from: string // 发送地址
  to: string // 接收地址
  amount: number // 金额
  coin: string // 币种
  time: string // 交易时间（ISO时间格式字符串）
  height: number // 区块高度
  handled: boolean // 是否已处理
}
