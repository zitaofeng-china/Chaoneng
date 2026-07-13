import zhCN from './zh-CN'
import en from './en'

/** 应用内置语言包（静态导入，避免动态 import 语言包模块失败） */
export const localeMessages = {
  'zh-CN': zhCN,
  en
} as const

export type AppLocaleLang = keyof typeof localeMessages

export function getLocaleMessages(lang: string) {
  if (lang in localeMessages) {
    return localeMessages[lang as AppLocaleLang]
  }
  return localeMessages['zh-CN']
}
