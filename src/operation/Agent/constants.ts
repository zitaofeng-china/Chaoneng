import { createStatusOptions, withAllOption, type StatusMeta } from '@/utils/tableHelpers'

export const AGENT_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '启用' },
  2: { label: '禁用' }
}

export const AGENT_STATUS_OPTIONS = createStatusOptions(AGENT_STATUS_MAP, '')

export const AGENT_LEVEL_LABELS: Record<number, string> = {
  1: '一级代理',
  2: '二级代理',
  3: '三级代理',
  8: '自营代理'
}

export const AGENT_LEVEL_OPTIONS = Object.entries(AGENT_LEVEL_LABELS).map(([value, label]) => ({
  label,
  value: Number(value)
}))

export const AGENT_LEVEL_SEARCH_OPTIONS = withAllOption(AGENT_LEVEL_OPTIONS)

export const BATCH_AGENT_LEVEL_OPTIONS = [{ label: '选择等级', value: 0 }, ...AGENT_LEVEL_OPTIONS]

export const BOT_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '启用', type: 'success' },
  2: { label: '禁用', type: 'danger' }
}

export const BOT_STATUS_OPTIONS = createStatusOptions(BOT_STATUS_MAP, '')

export const MESSAGE_SEND_KIND_OPTIONS = withAllOption(
  [
    { label: '只发一次', value: 1 },
    { label: '周期发送', value: 2 }
  ],
  0
)

export const AGENT_BILL_ORDER_TYPE_MAP: Record<number, string> = {
  1: '代理充值',
  2: '用户充值',
  3: '兑换',
  4: '按时间',
  5: '按笔数',
  6: '福利能量',
  7: '闪租',
  8: '即用能量',
  9: '批量能量',
  10: '激活',
  11: '机器人付费',
  12: '奖励',
  15: '速充能量',
  20: '托管',
  21: '托管速充'
}

export const AGENT_BILL_ORDER_TYPE_OPTIONS = Object.entries(AGENT_BILL_ORDER_TYPE_MAP).map(
  ([value, label]) => ({
    label,
    value: Number(value)
  })
)

export const AGENT_BILL_FLOW_IN = 1
export const AGENT_BILL_FLOW_OUT = 2

export const AGENT_BILL_FLOW_MAP: Record<number, string> = {
  [AGENT_BILL_FLOW_IN]: '入款',
  [AGENT_BILL_FLOW_OUT]: '出款'
}

export const AGENT_BILL_FLOW_OPTIONS = [
  { label: '入款', value: AGENT_BILL_FLOW_IN },
  { label: '出款', value: AGENT_BILL_FLOW_OUT }
]

export const USER_BILL_ORDER_TYPE_MAP: Record<number, string> = {
  1: '代理充值',
  2: '用户充值',
  3: '兑换',
  4: '按时间',
  5: '按笔数',
  6: '福利能量',
  7: '闪租',
  8: '即用能量',
  9: '批量能量',
  10: '激活',
  11: '机器人付费',
  20: '托管'
}

export const USER_BILL_ORDER_TYPE_OPTIONS = Object.entries(USER_BILL_ORDER_TYPE_MAP).map(
  ([value, label]) => ({
    label,
    value: Number(value)
  })
)

export const INVITE_REWARD_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '已发放', type: 'success' },
  2: { label: '未发放', type: 'danger' }
}

export const INVITE_REWARD_STATUS_OPTIONS = createStatusOptions(INVITE_REWARD_STATUS_MAP)

export const BALANCE_COIN_OPTIONS = withAllOption([
  { label: 'TRX', value: 'TRX' },
  { label: 'USDT', value: 'USDT' }
])
