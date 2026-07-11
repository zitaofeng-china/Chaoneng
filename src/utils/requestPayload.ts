/**
 * 请求体中的 keyboards 字段规范化为数字 ID 数组。
 * 历史逻辑曾挂在 axios 拦截器；业务侧组装 payload 时应显式调用本函数。
 */
export const normalizeKeyboardsIds = (keyboards: unknown): number[] => {
  if (!Array.isArray(keyboards)) {
    return []
  }

  return keyboards
    .map((item) => {
      if (typeof item === 'object' && item !== null) {
        const record = item as { id?: unknown }
        return Number(record.id ?? item)
      }
      return Number(item)
    })
    .filter((id) => !Number.isNaN(id) && id > 0)
}

/**
 * 若 data 含 keyboards 数组，返回规范化后的浅拷贝；否则返回原值。
 */
export const withNormalizedKeyboards = <T>(data: T): T => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data
  }

  const record = data as Record<string, unknown>
  if (!Array.isArray(record.keyboards)) {
    return data
  }

  return {
    ...record,
    keyboards: normalizeKeyboardsIds(record.keyboards)
  } as T
}
