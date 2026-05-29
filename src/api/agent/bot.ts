import request from '@/axios'
import type {
  AgentBotQueryParams,
  AgentBotListResponse,
  UpdateAgentBotPayload,
  UpdateAgentBotStatusPayload
} from './bot.types'

// 导出类型定义
export * from './bot.types'

// ==================== 机器人管理接口（统一） ====================

/**
 * 获取机器人列表
 * GET /v1/bot
 */
export const getAgentBotListApi = (
  params: AgentBotQueryParams
): Promise<IResponse<AgentBotListResponse>> => {
  return request.get({ url: '/v1/bot', params })
}

/**
 * 更新机器人信息
 * PUT /v1/bot
 */
export const updateAgentBotApi = (data: UpdateAgentBotPayload): Promise<IResponse> => {
  return request.put({ url: '/v1/bot', data })
}

/**
 * 更新机器人状态（兼容接口）
 * @deprecated 请使用 updateAgentBotApi 代替
 */
export const updateAgentBotStatusApi = (data: UpdateAgentBotStatusPayload): Promise<IResponse> => {
  const payload: UpdateAgentBotPayload = {
    id: Number(data.id),
    status: data.status
  }
  return updateAgentBotApi(payload)
}

/**
 * 导出机器人列表
 * GET /v1/bot/export
 */
export const exportAgentBotListApi = (params: AgentBotQueryParams): Promise<IResponse<Blob>> => {
  return request.get({ url: '/v1/bot/export', params, responseType: 'blob' })
}
