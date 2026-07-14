/**
 * Telegram 用户/机器人名片链接域名。
 * 国内部分网络 t.me 不可用，统一使用 telegram.me（官方等价入口）。
 */
const TELEGRAM_USER_URL = 'https://telegram.me'

export const getTelegramUserUrl = (username?: string | null) => {
  const normalizedUsername = String(username ?? '')
    .trim()
    .replace(/^@+/, '')

  if (!normalizedUsername) return ''

  return `${TELEGRAM_USER_URL}/${normalizedUsername}`
}

/** 打开 Telegram 用户名片；username 无效时返回 false */
export const openTelegramUser = (username?: string | null) => {
  const url = getTelegramUserUrl(username)
  if (!url) return false
  window.open(url, '_blank')
  return true
}
