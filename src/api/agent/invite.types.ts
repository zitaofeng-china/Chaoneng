// ==================== 邀请列表接口类型定义 ====================

/**
 * 分页信息
 */
export interface Pager {
  current_page: number // 当前页码
  page_size: number // 每页数量
  total: number // 总数量
}

/**
 * 邀请记录列表查询参数
 */
export interface InviteListQueryParams {
  agent_id?: number // 代理ID
  current_page?: number // 页码
  keyword?: string // 关键字搜索
  order?: string // 排序参数，格式：column [ASC|DESC]，多字段用逗号分隔，ASC为升序，DESC为降序
  page_size?: number // 每页大小
}

/**
 * 邀请记录列表项
 */
export interface InviteRecordItem {
  id: number // 邀请记录ID
  created_at: number // 创建时间（Unix时间戳-秒）
  updated_at: number // 更新时间（Unix时间戳-秒）
  agent_id: number // 代理ID
  bot_id: number // 机器人ID
  source_id: number // 邀请人ID（source）
  target_id: number // 受邀人ID（target）
  reward: string // 奖励金额
  agent_name: string // 代理名称
  bot_name: string // 机器人名称
  source_tg_name: string // 邀请人TG名称
  target_tg_name: string // 受邀人TG名称
}

/**
 * 邀请记录列表响应数据
 */
export interface InviteListResponse {
  list: InviteRecordItem[]
  pager?: Pager
  total?: number // 兼容不同的分页格式
}

/**
 * 机器人选项（用于下拉选择）
 */
export interface BotOption {
  label: string // 显示文本
  value: string // 机器人ID
}
