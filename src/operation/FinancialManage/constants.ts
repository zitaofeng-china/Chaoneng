export const RESOURCE_SUPPLEMENT_KIND_OPTIONS = [
  { label: '能量', value: '能量' },
  { label: '带宽', value: '带宽' }
]

export const RESOURCE_SUPPLEMENT_SOURCE_OPTIONS = [
  { label: '能量收购池 能量', value: '能量收购池 能量' },
  { label: '带宽收购池 带宽', value: '带宽收购池 带宽' },
  { label: 'https://justlend.org 能量', value: 'https://justlend.org 能量' },
  { label: 'https://feee.io 带宽', value: 'https://feee.io 带宽' },
  { label: 'https://trxfee.io 带宽', value: 'https://trxfee.io 带宽' }
]

export const withAllOption = <T extends string | number>(
  options: { label: string; value: T }[]
) => {
  return [{ label: '全部', value: '' }, ...options]
}
