/** 关键词回复语音：接口里「全部」为空字符串。 */
export const REPLY_LANG_ALL = ''
/** 下拉框不能用空字符串做选项值，提交时再转成空。 */
export const REPLY_LANG_SELECT_ALL = '__ALL__'

export const REPLY_LANG_OPTIONS = [
  { label: '全部', value: REPLY_LANG_SELECT_ALL },
  { label: '简体中文', value: 'cn' },
  { label: '繁體中文', value: 'tw' },
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' },
  { label: '한국어', value: 'ko' },
  { label: 'Español', value: 'es' },
  { label: 'Türkçe', value: 'tr' },
  { label: 'العربية', value: 'ar' }
] as const

export const formatReplyLang = (lang?: string | null) => {
  const value = (lang || '').trim()
  if (!value || value === REPLY_LANG_SELECT_ALL) return '全部'
  return REPLY_LANG_OPTIONS.find((item) => item.value === value)?.label || value
}

export const normalizeReplyLang = (lang?: string | null) => {
  const value = (lang || '').trim()
  if (!value || value === REPLY_LANG_SELECT_ALL) return REPLY_LANG_ALL
  return value
}

export const toReplyLangSelectValue = (lang?: string | null) => {
  const value = normalizeReplyLang(lang)
  return value || REPLY_LANG_SELECT_ALL
}
