/**
 * 角色列表项
 */
export interface RoleItem {
  id: number
  name: string
  status: number // 1:启用, 2:禁用
  permissions?: Array<string | number> | null
  created_at: number // Unix 时间戳
  updated_at: number // Unix 时间戳
}

/**
 * 分页信息
 */
export interface Pager {
  current_page: number
  page_size: number
  total: number
}

/**
 * 角色列表数据
 */
export interface RoleListData {
  list: RoleItem[]
  pager: Pager
}

/**
 * 创建角色参数
 */
export interface CreateRolePayload {
  name: string // 角色名称
  permissions: string[] // 权限列表
  status: number // 状态 (1:启用, 2:禁用)
}

/**
 * 更新角色参数
 */
export interface UpdateRolePayload {
  id: number // 角色ID
  name: string // 角色名称
  permissions: string[] // 权限列表
  status: number // 状态 (1:启用, 2:禁用)
}
