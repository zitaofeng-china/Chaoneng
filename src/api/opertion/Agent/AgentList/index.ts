import request from '@/axios'

// ==================== 类型定义 ====================

/**
 * 代理列表查询参数
 */
export interface AgentQueryParams {
  keyword?: string // 关键字：代理ID/联系方式
  current_page?: number // 页码
  page_size?: number // 每页数量
  status?: number | string // 状态：'' 或 undefined 表示全部, 1 表示启用, 2 表示禁用
  price_id?: number | string // 价格ID，即代理等级 (1:一级代理, 2:二级代理, 3:三级代理)
  start_time?: string // 开始时间 (Unix 时间戳字符串，秒级)
  end_time?: string // 结束时间 (Unix 时间戳字符串，秒级)
  order?: string // 排序参数
}

/**
 * 代理列表项
 */
export interface AgentItem {
  id: number
  username: string // 代理名称
  email: string | null // 邮箱
  role_id: number // 角色ID
  price_id?: number // 代理等级 (1:一级代理, 2:二级代理, 3:三级代理)
  status: number // 状态 (1:启用, 2:禁用)
  gift_bandwidth: boolean // 是否赠送带宽
  trx_balance: string // TRX余额
  usdt_balance: string // USDT余额
  notify_chat_id?: number // 代理TGID (通知 chat id)
  notify_threshold?: string // 提醒阈值
  created_at: number // 创建时间 (时间戳-秒)
  updated_at: number // 更新时间 (时间戳-秒)
  bot_count: number // 机器人数量
  user_count: number // 总用户数
  trx_income: string // TRX收入
  usdt_income: string // USDT收入
  role?: {
    id: number
    name: string
    status: number
    created_at: number
    updated_at: number
    permissions: unknown[] | null
  }
}

/**
 * 代理统计数据
 */
export interface AgentStats {
  sum_balance_trx: string // 代理余额合计
  sum_user_count: number // 关注量合计
  sum_bot_count: number // 机器人数量合计
  sum_income_trx: string // 代理收入TRX合计
  sum_income_usdt: string // 代理收入USDT合计
  sum_deposit_trx: string // 代理充值合计
}

export interface AgentPager {
  current_page: number
  page_size: number
  total: number
}

/**
 * 代理列表响应数据
 */
export interface AgentListResponseData {
  list: AgentItem[]
  pager: AgentPager
  stats?: AgentStats
}

/**
 * 新增代理参数
 */
export interface AddAgentPayload {
  username: string // 代理名称
  email: string // 邮箱
  password: string // 登录密码
  price_id?: number // 代理等级 (1:一级代理, 2:二级代理, 3:三级代理)
  gift_bandwidth?: boolean // 是否赠送带宽 (true:赠送, false:不赠送)
  status?: number // 状态 (1:启用, 2:禁用)
}

/**
 * 更新代理参数
 */
export interface UpdateAgentPayload {
  id: number | string // 代理ID
  email?: string // 邮箱
  password?: string // 登录密码 (留空不修改)
  gift_bandwidth?: boolean // 是否赠送带宽 (true:赠送, false:不赠送)
  status?: number // 状态
  price_id?: number // 代理等级 (1:一级代理, 2:二级代理, 3:三级代理)
}

/**
 * 批量更新代理参数
 */
export interface BatchUpdateAgentPayload {
  ids: number[] // 代理ID数组
  gift_bandwidth?: boolean // 是否赠送带宽 (true:赠送, false:不赠送)
  price_id?: number // 代理等级 (1:一级代理, 2:二级代理, 3:三级代理)
  status?: number // 状态 (1:启用, 2:禁用)
}

/**
 * 代理充值参数
 */
export interface RechargeAgentPayload {
  agent_id: number // 代理ID
  amount: number // 充值金额
  coin: string // 币种 (TRX/USDT)
  secret: string // 密钥
  describe?: string // 备注
}

// ==================== 接口函数 ====================

/**
 * 获取代理列表
 */
export const v2GetAgentList = (
  params: AgentQueryParams
): Promise<IResponse<AgentListResponseData>> => {
  return request.get({ url: '/v2/manage/agent/list', params })
}

/**
 * 新增代理
 */
export const v2CreateAgent = (data: AddAgentPayload): Promise<IResponse> => {
  return request.post({ url: '/v2/manage/agent/add', data })
}

/**
 * 更新代理
 */
export const v2UpdateAgent = (data: UpdateAgentPayload): Promise<IResponse> => {
  return request.post({ url: '/v2/manage/agent/update', data })
}

/**
 * 批量更新代理
 */
export const v2BatchUpdateAgent = (data: BatchUpdateAgentPayload): Promise<IResponse> => {
  return request.post({ url: '/v2/manage/agent/update/batch', data })
}

/**
 * 代理充值
 */
export const v2ChangeAgentBalance = (data: RechargeAgentPayload): Promise<IResponse> => {
  return request.post({ url: '/v2/manage/agent/change_balance', data })
}
