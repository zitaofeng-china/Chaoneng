const TELEGRAM_USER_URL = 'https://t.me'

export const getTelegramUserUrl = (username?: string | null) => {
  const normalizedUsername = String(username ?? '')
    .trim()
    .replace(/^@+/, '')

  if (!normalizedUsername) return ''

  return `${TELEGRAM_USER_URL}/${normalizedUsername}`
}
