import request from '@/axios'
import type { AgentBillListParams, AgentBillListResponse } from './ledger.types'

// 导出类型定义
export * from './ledger.types'

// ========== 代理账单接口 ==========

/**
 * 获取代理账单列表
 * GET /v1/bill/agent
 */
export const v1GetAgentBillList = (
  params: AgentBillListParams
): Promise<IResponse<AgentBillListResponse>> => {
  return request.get({
    url: '/v1/bill/agent',
    params
  })
}
