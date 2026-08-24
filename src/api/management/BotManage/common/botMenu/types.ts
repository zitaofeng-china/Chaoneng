/**
 * Bot Menu API Types
 * 代理端机器人菜单接口类型定义
 */

/**
 * 菜单多语言文案
 */
export interface BotMenuTranslations {
  ar?: string
  cn?: string
  en?: string
  es?: string
  ja?: string
  ko?: string
  tr?: string
  tw?: string
}

/**
 * 菜单项
 */
export interface BotMenuItem {
  id: number
  created_at: number
  updated_at: number
  agent_id: number
  bot_id: number
  name: string
  translations?: BotMenuTranslations
  /** @deprecated 旧字段，兼容读取 */
  menu_name?: string
  order_num: number
  status: number // 1=启用, 2=禁用
}

/**
 * 获取菜单列表 - 请求参数
 * GET /v1/bot/menu
 */
export interface GetBotMenuListParams {
  agent_id?: number
  bot_id: number // required
  status?: number // 1=启用, 2=禁用
}

/**
 * 获取菜单列表 - 响应数据
 * 注意：data 字段直接是菜单数组
 */
export type GetBotMenuListResponse = BotMenuItem[]

/**
 * 添加菜单 - 请求参数
 * POST /v1/bot/menu
 */
export interface AddBotMenuParams {
  name: string
  translations: BotMenuTranslations
  order_num: number
  status: number // 1=启用, 2=禁用
}

/**
 * 更新菜单 - 请求参数（单个菜单项）
 */
export interface UpdateBotMenuItemParams {
  id: number
  name: string
  translations: BotMenuTranslations
  order_num: number
  status: number
}

/**
 * 批量更新菜单 - 请求参数
 * PUT /v1/bot/menu
 */
export interface BatchUpdateBotMenuParams {
  bot_id: number
  menus: UpdateBotMenuItemParams[]
}
