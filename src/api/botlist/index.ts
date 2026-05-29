import request from '@/axios'
import type {
  BotListParams,
  BotListResponse,
  BotDetail,
  SystemPrice,
  BotPriceConfig,
  BotWealConfig,
  AddressListParams,
  AddressListResponse,
  AddressAddParams,
  AddressDeleteParams,
  UpdateAddressParams,
  UpdateBotParams,
  UpdateBotPriceParams,
  UpdateBotWealParams,
  RenewBotParams,
  BotRenewPrice,
  CreateBotParams,
  AgentBillListParams,
  AgentBillListResponse
} from './types'

// ========== 机器人管理接口 ==========

/**
 * 获取机器人列表 - 代理端
 * GET /v1/bot
 */
export const v1GetBotList = (params: BotListParams): Promise<IResponse<BotListResponse>> => {
  return request.get({ url: '/v1/bot', params })
}

/**
 * 获取机器人详情
 * GET /v1/bot/{id}
 */
export const v1GetBotDetail = (id: number | string): Promise<IResponse<BotDetail>> => {
  return request.get({ url: `/v1/bot/${id}` })
}

/**
 * 创建机器人
 * POST /v1/bot/add
 */
export const v1CreateBot = (data: CreateBotParams): Promise<IResponse> => {
  return request.post({ url: '/v1/bot/add', data })
}

/**
 * 更新机器人基本信息
 * PUT /v1/bot
 */
export const v1UpdateBot = (data: UpdateBotParams): Promise<IResponse> => {
  return request.put({ url: '/v1/bot', data })
}

/**
 * 机器人续费
 * PUT /v1/bot/{id}/renew
 */
export const v1RenewBot = (data: RenewBotParams): Promise<IResponse> => {
  return request.put({ url: `/v1/bot/${data.id}/renew`, data })
}

/**
 * 获取机器人续费价格
 * GET /v1/bot/renew_fee
 */
export const v1GetBotRenewPrice = (): Promise<IResponse<BotRenewPrice>> => {
  return request.get({ url: '/v1/bot/renew_fee' })
}

/**
 * 同步TG状态
 * POST /v1/bot/sync-tg-status
 */
export const syncTgStatusApi = (botId: string): Promise<IResponse> => {
  return request.post({ url: '/v1/bot/sync-tg-status', data: { botId } })
}

// ========== 价格配置接口 ==========

/**
 * 获取系统价格（成本价）
 * GET /v1/price/system
 */
export const v1GetSystemPrice = (): Promise<IResponse<SystemPrice>> => {
  return request.get({ url: '/v1/price/system' })
}

/**
 * 获取机器人价格配置详情
 * GET /v1/price/bot/{id}
 */
export const v1GetBotPriceConfig = (id: number | string): Promise<IResponse<BotPriceConfig>> => {
  return request.get({ url: `/v1/price/bot/${id}` })
}

/**
 * 更新机器人价格配置
 * PUT /v1/price
 */
export const v1UpdateBotPrice = (data: UpdateBotPriceParams): Promise<IResponse> => {
  return request.put({ url: '/v1/price', data })
}

// ========== 福利配置接口 ==========

/**
 * 获取机器人福利配置
 * GET /v1/bot/{id}/weal
 */
export const v1GetBotWealConfig = (id: number | string): Promise<IResponse<BotWealConfig>> => {
  return request.get({ url: `/v1/bot/${id}/weal` })
}

/**
 * 更新机器人福利配置
 * PUT /v1/bot/{id}/weal
 */
export const v1UpdateBotWealConfig = (
  id: number | string,
  data: UpdateBotWealParams
): Promise<IResponse> => {
  return request.put({ url: `/v1/bot/${id}/weal`, data })
}

// ========== 地址管理接口 ==========

/**
 * 获取地址列表
 * GET /v1/address
 */
export const v1GetAddressList = (
  params: AddressListParams
): Promise<IResponse<AddressListResponse>> => {
  return request.get({ url: '/v1/address', params })
}

/**
 * 批量创建地址
 * POST /v1/address
 */
export const v1AddAddressList = (data: AddressAddParams): Promise<IResponse> => {
  return request.post({ url: '/v1/address', data })
}

/**
 * 批量删除地址
 * DELETE /v1/address
 */
export const v1DeleteAddressList = (data: AddressDeleteParams): Promise<IResponse> => {
  return request.delete({ url: '/v1/address', data })
}

/**
 * 更新地址
 * PUT /v1/address
 */
export const v1UpdateAddress = (data: UpdateAddressParams): Promise<IResponse> => {
  return request.put({ url: '/v1/address', data })
}

// ========== 账单管理接口 ==========

/**
 * 获取代理账单列表
 * GET /v1/bill/agent
 */
export const v1GetAgentBillList = (
  params: AgentBillListParams
): Promise<IResponse<AgentBillListResponse>> => {
  return request.get({ url: '/v1/bill/agent', params })
}
