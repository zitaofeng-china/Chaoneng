import { createStatusOptions, type StatusMeta } from '@/utils/tableHelpers'

export const CUSTOMER_SERVICE_STATUS_MAP: Record<number, StatusMeta> = {
  1: { label: '启用', type: 'success' },
  2: { label: '禁用', type: 'danger' }
}

export const CUSTOMER_SERVICE_STATUS_OPTIONS = createStatusOptions(CUSTOMER_SERVICE_STATUS_MAP, '')
