import request from '@/axios'
import type {
  AgentBotQueryParams,
  AgentBotListResponse,
  AgentBotItem,
  UpdateAgentBotPayload
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
 * 获取机器人详情
 * GET /v1/bot/{id}
 */
export const getAgentBotDetailApi = (id: number | string): Promise<IResponse<AgentBotItem>> => {
  return request.get({ url: `/v1/bot/${id}` })
}

/**
 * 更新机器人信息
 * PUT /v1/bot
 */
export const updateAgentBotApi = (data: UpdateAgentBotPayload): Promise<IResponse> => {
  return request.put({ url: '/v1/bot', data })
}
