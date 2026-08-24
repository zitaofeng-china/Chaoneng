/** 菜单多语言：与接口 translations 的 key 对齐。 */
export const MENU_LANG_OPTIONS = [
  { label: '简体中文', value: 'cn' },
  { label: '繁體中文', value: 'tw' },
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' },
  { label: '한국어', value: 'ko' },
  { label: 'Español', value: 'es' },
  { label: 'Türkçe', value: 'tr' },
  { label: 'العربية', value: 'ar' }
] as const

export type MenuLangCode = (typeof MENU_LANG_OPTIONS)[number]['value']

export type MenuTranslations = Record<MenuLangCode, string>

const toMenuText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const toTranslationMap = (translations: unknown): Record<string, string> => {
  if (!translations || typeof translations !== 'object') return {}
  return Object.fromEntries(
    Object.entries(translations as Record<string, unknown>).map(([key, value]) => [
      key,
      toMenuText(value)
    ])
  )
}

export const createEmptyMenuTranslations = (): MenuTranslations => ({
  cn: '',
  tw: '',
  en: '',
  ja: '',
  ko: '',
  es: '',
  tr: '',
  ar: ''
})

export const getMenuDisplayName = (item?: unknown) => {
  if (!item || typeof item !== 'object') return ''
  const source = item as Record<string, unknown>
  const translations = toTranslationMap(source.translations)
  return toMenuText(source.name) || toMenuText(source.menu_name) || translations.cn || ''
}

export const MENU_LANG_REQUIRED = 'cn' as const

export const isRequiredMenuLang = (lang: string) => lang === MENU_LANG_REQUIRED

export const normalizeMenuTranslations = (translations?: unknown): MenuTranslations => {
  const result = createEmptyMenuTranslations()
  const source = toTranslationMap(translations)

  MENU_LANG_OPTIONS.forEach(({ value }) => {
    result[value] = source[value] || ''
  })

  return result
}

export const buildMenuWriteFields = (item?: unknown) => {
  const source = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
  return {
    name: getMenuDisplayName(item),
    translations: normalizeMenuTranslations(source.translations)
  }
}

export const isSameMenuItem = (a?: { id?: number } | null, b?: { id?: number } | null) =>
  a != null && b != null && Number(a.id) === Number(b.id)
