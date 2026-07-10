export const BLACKLIST_SCOPE_OPTIONS = [
  { label: '闪兑订单', value: 3 },
  { label: '按时间订单', value: 4 },
  { label: '按笔数', value: 5 },
  { label: '闪租', value: 7 },
  { label: '即用能量', value: 8 },
  { label: '托管订单', value: 20 },
  { label: '激活', value: 10 },
  { label: '速充订单', value: 15 },
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
