/** 登录/绑定页发送邮箱验证码的倒计时秒数 */
export const EMAIL_CODE_RESEND_SECONDS = 60

const BIND_EMAIL_CODE_DRAFT_KEY = 'admin-bind-email-code-draft'

type BindEmailCodeDraft = {
  countdownEndsAt: number
  email_code: string
}

/** 密码登录跳转绑定时暂存验证码，绑定页复用同一份登录验证码。 */
export const stashBindEmailCodeDraft = (email_code: string, remainingSeconds: number) => {
  const code = email_code.trim()
  if (!/^\d{6}$/.test(code)) return
  const remaining = remainingSeconds > 0 ? remainingSeconds : EMAIL_CODE_RESEND_SECONDS
  const draft: BindEmailCodeDraft = {
    email_code: code,
    countdownEndsAt: Date.now() + remaining * 1000
  }
  sessionStorage.setItem(BIND_EMAIL_CODE_DRAFT_KEY, JSON.stringify(draft))
}

export const consumeBindEmailCodeDraft = ():
  | { email_code: string; remaining: number }
  | undefined => {
  const raw = sessionStorage.getItem(BIND_EMAIL_CODE_DRAFT_KEY)
  sessionStorage.removeItem(BIND_EMAIL_CODE_DRAFT_KEY)
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as Partial<BindEmailCodeDraft>
    const email_code = String(parsed.email_code || '').trim()
    if (!/^\d{6}$/.test(email_code)) return undefined
    const remaining = Math.max(0, Math.ceil(((parsed.countdownEndsAt || 0) - Date.now()) / 1000))
    return {
      email_code,
      remaining: remaining || EMAIL_CODE_RESEND_SECONDS
    }
  } catch {
    return undefined
  }
}
