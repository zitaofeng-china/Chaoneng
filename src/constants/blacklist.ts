export const BLACKLIST_SCOPE_OPTIONS = [
  { label: '代理充值', value: 1 },
  { label: '用户充值', value: 2 },
  { label: '闪兑', value: 3 },
  { label: '时间能量', value: 4 },
  { label: '笔数能量', value: 5 },
  { label: '福利能量', value: 6 },
  { label: '快速能量', value: 7 },
  { label: '即用能量', value: 8 },
  { label: '批量能量', value: 9 },
  { label: '批量激活', value: 10 },
  { label: '机器人付费', value: 11 },
  { label: '奖励', value: 12 },
  { label: '速充能量', value: 15 },
  { label: '能量托管', value: 20 },
  { label: '托管速充', value: 21 },
  { label: '理财订单', value: 82 }
]

export const BLACKLIST_SCOPE_LABEL_MAP = BLACKLIST_SCOPE_OPTIONS.reduce<Record<number, string>>(
  (map, item) => {
    map[item.value] = item.label
    return map
  },
  {}
)

export const BLACKLIST_STATUS_OPTIONS = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 2 }
]

export const BLACKLIST_DEFAULT_STATUS = 1
export const BLACKLIST_PLATFORM_AGENT_ID = 1
