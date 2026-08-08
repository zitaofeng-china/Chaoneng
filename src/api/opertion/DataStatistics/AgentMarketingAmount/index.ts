import request from '@/axios'
import type {
  AgentMarketingAmountData,
  AgentMarketingAmountParams,
  AgentMarketingBotExpenseData,
  AgentMarketingBotExpenseParams,
  AgentMarketingBotOrderData,
  AgentMarketingBotOrderParams
} from './types'

export * from './types'

/** 代理支出统计报表。 */
export const getAgentMarketingAmountReport = (
  params?: AgentMarketingAmountParams
): Promise<IResponse<AgentMarketingAmountData>> => {
  return request.get({
    url: '/v2/system/stats/agent-expense',
    params
  })
}

/** 机器人支出统计报表。 */
export const getBotExpenseReport = (
  params?: AgentMarketingBotExpenseParams
): Promise<IResponse<AgentMarketingBotExpenseData>> => {
  return request.get({
    url: '/v2/system/stats/bot-expense',
    params
  })
}

/** 指定机器人各类订单支出统计报表。 */
export const getBotOrderExpenseReport = (
  params: AgentMarketingBotOrderParams
): Promise<IResponse<AgentMarketingBotOrderData>> => {
  return request.get({
    url: '/v2/system/stats/bot-order',
    params
  })
}
