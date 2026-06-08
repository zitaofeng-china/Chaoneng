import request from '@/axios'

export interface NotifyBotInfo {
  id: number
  token: string
  user_name: string
  first_name: string
  updated_at: number
}

export interface SetNotifyBotParams {
  id?: number
  token: string
  user_name?: string
  first_name?: string
  updated_at?: string | number
}

/**
 * 获取通知机器人信息
 * GET /v1/bot/notify
 */
export const v1GetNotifyBot = (): Promise<IResponse<NotifyBotInfo>> => {
  return request.get({ url: '/v1/bot/notify' })
}

/**
 * 设置通知机器人
 * PUT /v1/bot/notify
 */
export const v1SetNotifyBot = (data: SetNotifyBotParams): Promise<IResponse> => {
  return request.put({ url: '/v1/bot/notify', data })
}
