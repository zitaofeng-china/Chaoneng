import request from '@/axios'
import type {
  UserBalanceRecordParams,
  UserListParamsV1,
  UserListResponseV1,
  RechargeUserParamsV1,
  AdminChangePasswordParamsV1,
  MassSendListParamsV1,
  MassSendListResponseV1,
  SendGroupMessageParamsV1,
  UpdateGroupMessageParams,
  UserBillListParamsV1,
  UserBillListResponseV1
} from './types'

// 导出类型定义
export * from './types'

// ==================== v1 接口（代理端 + 运营端通用） ====================

/**
 * 获取用户列表
 * GET /v1/user
 */
export const v1GetUserList = (params: UserListParamsV1): Promise<IResponse<UserListResponseV1>> => {
  return request.get({
    url: '/v1/user',
    params
  })
}

/**
 * 用户充值
 * PUT /v1/user/change_balance
 */
export const v1RechargeUser = (data: RechargeUserParamsV1): Promise<IResponse> => {
  return request.put({
    url: '/v1/user/change_balance',
    data
  })
}

/**
 * 管理员修改用户密码
 * PUT /v1/user
 */
export const v1AdminChangePassword = (data: AdminChangePasswordParamsV1): Promise<IResponse> => {
  return request.put({
    url: '/v1/user',
    data
  })
}

/**
 * 获取群发消息列表 - 新接口
 * GET /v1/message
 */
export const v1GetMassSendList = (
  params: MassSendListParamsV1
): Promise<IResponse<MassSendListResponseV1>> => {
  return request.get({
    url: '/v1/message',
    params
  })
}

/**
 * 删除群发消息 - 新接口
 * DELETE /v1/message/{id}
 */
export const v1DeleteMassSend = (id: number): Promise<IResponse> => {
  return request.delete({
    url: `/v1/message/${id}`
  })
}

/**
 * 给指定的机器人名下用户群发信息（支持多机器人）
 * POST /v1/message
 */
export const v1SendGroupMessage = (data: SendGroupMessageParamsV1): Promise<IResponse> => {
  return request.post({
    url: '/v1/message',
    data
  })
}

/**
 * 更新群发消息
 * PUT /v1/message
 */
export const v1UpdateGroupMessage = (data: UpdateGroupMessageParams): Promise<IResponse> => {
  return request.put({
    url: '/v1/message',
    data
  })
}

/**
 * 获取用户账单列表
 * GET /v1/bill/user
 */
export const v1GetUserBillList = (
  params: UserBillListParamsV1
): Promise<IResponse<UserBillListResponseV1>> => {
  return request.get({
    url: '/v1/bill/user',
    params
  })
}

/**
 * 获取用户余额记录
 * GET /v1/bill/user
 */
export const getUserBalanceRecordsApi = (id: number | string, params?: UserBalanceRecordParams) => {
  return request.get({ url: '/v1/bill/user', params: { ...(params || {}), user_id: id } })
}

/**
 * 导出用户列表
 * GET /v1/user/export
 */
export const exportTgUserListApi = (params: any) => {
  return request.get({ url: '/v1/user/export', params, responseType: 'blob' })
}

// ==================== v2 接口（运营端） ====================

/**
 * 获取群发消息列表 - 新接口
 * GET /v2/message
 */
export const v2GetMassSendList = (
  params: MassSendListParamsV1
): Promise<IResponse<MassSendListResponseV1>> => {
  return request.get({
    url: '/v2/message',
    params
  })
}

/**
 * 删除群发消息 - 新接口
 * DELETE /v2/message/{id}
 */
export const v2DeleteMassSend = (id: number): Promise<IResponse> => {
  return request.delete({
    url: `/v2/message/${id}`
  })
}

/**
 * 给指定的机器人名下用户群发信息（支持多机器人）
 * POST /v2/message
 */
export const v2SendGroupMessage = (data: SendGroupMessageParamsV1): Promise<IResponse> => {
  return request.post({
    url: '/v2/message',
    data
  })
}

/**
 * 更新群发消息
 * PUT /v2/message
 */
export const v2UpdateGroupMessage = (data: UpdateGroupMessageParams): Promise<IResponse> => {
  return request.put({
    url: '/v2/message',
    data
  })
}

/**
 * 获取机器人列表（用于消息列表筛选）
 * GET /v2/message/bot
 */
export const v2GetMessageBotList = (): Promise<
  IResponse<Array<{ id: number; user_name: string }>>
> => {
  return request.get({
    url: '/v2/message/bot'
  })
}
