import type { StatusMeta } from '@/utils/tableHelpers'

export const AUTH_ENABLE_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '启用', type: 'success' },
  2: { label: '禁用', type: 'danger' }
}
