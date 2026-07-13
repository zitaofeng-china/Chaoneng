// ========== 订单接口类型定义 ==========

/**
 * 闪兑订单查询参数
 */
export interface V2ExchangeListParams {
  bot_id?: number // 机器人ID
  bot_name?: string // 机器人名称
  coin?: string // 币种（USDT/TRX）
  current_page?: number // 当前页码
  end_time?: string // 结束时间
  keyword?: string // 关键字
  order_id?: string // 订单ID（字符串格式）
  order?: string // 排序参数
  page_size?: number // 每页大小
  start_time?: string // 开始时间
  status?: number // 状态: 1-新订单, 2-已支付, 3-已发送, 4-已回收, 5-已完成, 6-失败订单, 7-已退款, 8-已取消, 9-中止订单
  source?: string // 来源
}

/**
 * 闪兑订单列表项
 */
export interface V2ExchangeItem {
  id: string // 订单ID
  created_at: number // 创建时间（Unix时间戳-秒）
  updated_at: number // 更新时间（Unix时间戳-秒）
  paid_at: number // 支付时间（Unix时间戳-秒）
  kind: number // 类型: 1-代理充值, 2-用户充值, 3-兑换, 4-时间能量, 5-笔数能量, 6-福利能量, 7-快速能量, 8-即用能量, 9-批量能量, 10-批量激活, 11-机器人付费, 15-速充能量, 20-托管, 21-托管速充
  status: number // 状态: 1-新订单, 2-已支付, 3-已发送, 4-已回收, 5-已完成, 6-失败订单, 7-已退款, 8-已取消, 9-中止订单
  user_id: number // 用户ID
  agent_id: number // 代理ID
  bot_id: number // 机器人ID
  amount: string // 金额
  coin: string // 币种: TRX, USDT
  receive_address: string // 收款地址
  pay_id: string // 支付ID
  cost: string // 成本
  describe: string // 描述
  agent_name?: string // 代理名称
  bot_name?: string // 机器人名称
  bot_user_name?: string // 机器人用户名
  bot_first_name?: string // 机器人昵称
  tg_user_name?: string // TG用户名
  tg_first_name?: string // TG昵称
  in_coin?: string // 输入币种
  out_coin?: string // 输出币种
  out_amount?: string // 输出金额
  real_rate?: string // 实时汇率
  actual_rate?: string // 实际汇率
  agent_profit?: string // 代理利润
  plate_profit?: string // 平台利润
  agent_cost?: string // 代理扣款
  completed_at?: number | null // 完成时间（Unix时间戳-秒）
  account?: string // 用户账号
  email?: string // 用户邮箱
  source?: string // 来源
}

/**
 * 闪兑详情 - 兑换信息
 */
export interface V2ExchangeInfo {
  order_id: string // 订单ID
  in_address: string // 输入地址
  in_amount: string // 输入金额
  in_coin: string // 输入币种
  real_rate: string // 实时汇率
  actual_rate: string // 实际汇率
  out_address: string // 输出地址
  out_amount: string // 输出金额
  out_coin: string // 输出币种
  out_txid: string // 输出交易hash
  out_at: number // 输出时间（Unix时间戳-秒）
  agent_profit: string // 代理利润
  plate_profit: string // 平台利润
  retry_at?: number // 补发时间（Unix时间戳-秒），不存在/为空/为0表示未补发
}

/**
 * 闪兑详情 - 交易信息
 */
export interface V2TransactionInfo {
  id: string // 交易hash
  from: string // 发送地址
  to: string // 接收地址
  amount: string // 金额
  coin: string // 币种
  height: number // 区块高度
  time: number // 交易时间（Unix时间戳-秒）
  handled: boolean // 是否已处理
}

/**
 * 闪兑订单详情
 */
export interface V2ExchangeDetail {
  id: string // 订单ID
  created_at: number // 创建时间（Unix时间戳-秒）
  updated_at: number // 更新时间（Unix时间戳-秒）
  paid_at: number // 支付时间（Unix时间戳-秒）
  kind: number // 类型
  status: number // 状态
  user_id: number // 用户ID
  agent_id: number // 代理ID
  bot_id: number // 机器人ID
  amount: string // 金额
  coin: string // 币种
  receive_address: string // 收款地址
  pay_id: string // 支付ID
  cost: string // 成本
  describe: string // 描述
  agent_name: string // 代理名称
  bot_user_name: string // 机器人用户名
  bot_first_name: string // 机器人昵称
  tg_user_name: string // TG用户名
  tg_first_name: string // TG昵称
  agent_cost?: string // 代理扣款
  exchange: V2ExchangeInfo // 兑换信息
  pay_transaction: V2TransactionInfo // 支付交易信息
  deliver_transaction: V2TransactionInfo // 发放交易信息
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
 * 闪兑订单列表响应
 */
export interface V2ExchangeListResponse {
  list: V2ExchangeItem[] // 订单列表
  pager: V2Pager // 分页信息
}
