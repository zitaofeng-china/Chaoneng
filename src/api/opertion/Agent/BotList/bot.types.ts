// ==================== 机器人列表类型定义 ====================

/**
 * 分页信息
 */
export interface Pager {
  current_page: number // 当前页码
  page_size: number // 每页数量
  total: number // 总数量
}

/**
 * 机器人列表查询参数
 */
export interface AgentBotQueryParams {
  agent_name?: string // 代理名称
  current_page?: number // 页码
  keyword?: string // 关键字搜索
  page_size?: number // 每页大小
  status?: number // 状态筛选
  user_name?: string // 机器人用户名
  order?: string // 排序参数
}

/**
 * 机器人列表项
 */
export interface AgentBotItem {
  id: number // 机器人ID
  agent_id: number // 代理ID
  agent_name: string // 代理名称
  auto_renew: number // 自动续费（1: 开启, 2: 关闭）
  avatar?: string // 头像
  created_at: number // 创建时间（Unix时间戳-秒）
  description?: string // 机器人描述内容
  describe: string // 描述
  expired_at: number // 过期时间（Unix时间戳-秒）
  first_name: string // 机器人昵称
  order_count: number // 交易订单数
  reward?: {
    first_deposit?: number // 首充奖励
    first_visit?: number // 访问奖励
    premium_invite?: number // 邀请奖励-会员
    standard_invite?: number // 邀请奖励-非会员
  }
  short_description?: string // 简介
  status: number // 状态 (1: 启用, 2: 禁用)
  tg_admin: string // 管理员TG号
  token: string // 机器人Token
  total_fee: string // 总费用
  updated_at: number // 更新时间（Unix时间戳-秒）
  user_count: number // 用户数量
  user_name: string // 机器人用户名
}

/**
 * 机器人列表响应数据
 */
export interface AgentBotListResponse {
  list: AgentBotItem[]
  pager: Pager
}

/**
 * 更新机器人参数
 */
export interface UpdateAgentBotPayload {
  id: number | string // 机器人ID
  auto_renew: number // 自动续费 (1: 开启, 2: 关闭)
  avatar: string // 头像
  short_description: string // 简介
  description: string // 机器人描述内容
  first_name: string // 机器人昵称
  describe: string // 描述
  reward: {
    first_deposit: number // 首充奖励
    premium_invite: number // 邀请奖励-会员
    standard_invite: number // 邀请奖励-非会员
  }
  status: number // 状态 (1: 启用, 2: 禁用)
  tg_admin: string // 管理员TG号
  invite_reward: number // 邀请奖励（兼容字段）
}
