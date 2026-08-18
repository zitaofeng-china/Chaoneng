import request from '@/axios'
import type { RoleItem, RoleListData, CreateRolePayload, UpdateRolePayload } from './type'

export type { RoleItem, RoleListData, Pager, CreateRolePayload, UpdateRolePayload } from './type'

const ROLE_API_BASE = '/v2/role/'

/** GET /v2/role/list */
export const v2GetRoleList = (): Promise<IResponse<RoleListData>> => {
  return request.get({ url: `${ROLE_API_BASE}list` })
}

/** GET /v2/role/{id} */
export const v2GetRoleDetail = (id: number): Promise<IResponse<RoleItem>> => {
  return request.get({ url: `${ROLE_API_BASE}${id}` })
}

/** POST /v2/role/create */
export const v2CreateRole = (data: CreateRolePayload): Promise<IResponse> => {
  return request.post({ url: `${ROLE_API_BASE}create`, data })
}

/** POST /v2/role/update */
export const v2UpdateRole = (data: UpdateRolePayload): Promise<IResponse> => {
  return request.post({ url: `${ROLE_API_BASE}update`, data })
}

/** POST /v2/role/delete/{id} */
export const v2DeleteRole = (id: number): Promise<IResponse> => {
  return request.post({ url: `${ROLE_API_BASE}delete/${id}` })
}
