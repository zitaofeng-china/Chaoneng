/**
 * 资源补充（Charge）API 类型定义
 */

/**
 * 资源补充列表查询参数
 * GET /v1/charge
 */
export interface ChargeListParams {
  current_page?: number // 页码
  page_size?: number // 每页大小
  keyword?: string // 关键字
  kind?: string // 资源类型 [能量, 带宽]
  order?: string // 排序，单字段：column [ASC|DESC]，多字段用逗号隔开
  status?: number // 状态
}

/**
 * 资源补充列表项
 */
export interface ChargeItem {
  id: number
  created_at: number // 创建时间（Unix时间戳）
  updated_at: number // 更新时间（Unix时间戳）
  vault: string // 财务地址（付款）
  origin: string // 供给源（如"能量收购池 能量"）
  target: string // 供给对象/池子地址
  minimum: number // 补充阈值（低于则补）
  amount: number // 补充数量
  status: number // 状态：1=启动, 2=关闭
}

/**
 * 分页信息
 */
export interface ChargePager {
  current_page: number
  page_size: number
  total: number
}

/**
 * 资源补充列表响应
 */
export interface ChargeListResponse {
  list: ChargeItem[]
  pager: ChargePager
}

/**
 * 资源补充记录查询参数
 * GET /v1/charge/log
 */
export interface ChargeLogParams {
  current_page?: number // 页码
  page_size?: number // 每页大小
  keyword?: string // 关键字
  kind?: string // 资源类型 [能量, 带宽]
  origin?: string // 供给源
  order?: string // 排序
  start_time?: string // 开始时间
  end_time?: string // 结束时间
}

/**
 * 资源补充记录项
 */
export interface ChargeLogItem {
  id: number
  created_at: number
  updated_at: number
  kind: string // 资源类型
  origin: string // 供给源
  finance_address: string // 财务地址
  target_pool: string // 供给对象/池子
  amount: number // 补充数量
  status: number // 状态
  txid?: string // 交易hash
}

/**
 * 资源补充任务模型（创建/更新参数）
 * POST /v1/charge/task
 * PUT /v1/charge/task
 */
export interface ChargeTaskParams {
  id?: number // 任务ID（更新时必填）
  amount: number // 补充数量
  minimum: number // 阈值（低于则补）
  origin: string // 供给源（如：能量收购池、能量）
  status: number // 状态：1=启动, 2=关闭
  target: string // 供给对象/池子地址
  vault?: string // 财务地址（付款，可选）
  created_at?: string // 创建时间
  updated_at?: string // 更新时间
}

/**
 * 资源补充记录列表响应
 */
export interface ChargeLogResponse {
  list: ChargeLogItem[]
  pager: ChargePager
}
