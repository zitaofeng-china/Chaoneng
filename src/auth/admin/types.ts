export type UnixTimestamp = number | string

export interface AdminSession {
  access_expires_at: UnixTimestamp
  access_token: string
  refresh_expires_at: UnixTimestamp
  token_type: 'Bearer'
}

/** 登录/刷新过期时间：ISO 时间（如 2026-08-15T12:15:00+08:00）、unix 秒或毫秒。 */
export const parseUnixSeconds = (value?: unknown): number | undefined => {
  if (value == null || value === '') return undefined
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return undefined
    return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value)
  }
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed)
    if (!Number.isFinite(n) || n <= 0) return undefined
    return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n)
  }

  const ms = Date.parse(trimmed)
  if (!Number.isFinite(ms) || ms <= 0) return undefined
  return Math.floor(ms / 1000)
}

export interface AdminNotify {
  balance_threshold?: number | string
  chat_ids?: number[]
  chat_id?: number | number[]
  order_subscription?: number[] | null
}

export interface AdminRolePermission {
  code?: number | string
  describe?: string
  id?: number
  name?: string
  path?: string
}

export interface AdminRole {
  created_at?: string | number
  id?: number
  name?: string
  permissions?: Array<string | number | AdminRolePermission> | null
  status?: number
}

export interface AdminSecurity {
  current_auth_method?: string
  passkey_count?: number
  totp_enabled?: boolean
  role_name?: string
  permissions?: Array<string | number | AdminRolePermission> | null
}

/** GET /v1/admin/me */
export interface AdminMe {
  address?: string
  created_at?: string | number
  current_auth_method?: string
  email?: string
  gift_bandwidth?: boolean
  id?: number
  notify?: AdminNotify
  notify_chat_id?: AdminNotify['chat_id']
  notify_chat_ids?: AdminNotify['chat_ids']
  notify_threshold?: number | string
  permissions?: Array<string | number> | null
  price_id?: number
  role?: AdminRole
  role_id?: number
  security?: AdminSecurity
  status?: number
  trx_balance?: number | string
  updated_at?: string | number
  username?: string
}

const toPasskeyCount = (value: unknown) => {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? count : 0
}

export const hasAdminPasskey = (value?: number | null) => toPasskeyCount(value) > 0

export const getAdminSecurity = (me?: AdminMe | null) => ({
  current_auth_method: me?.security?.current_auth_method || me?.current_auth_method || '',
  passkey_count: toPasskeyCount(me?.security?.passkey_count),
  totp_enabled: Boolean(me?.security?.totp_enabled),
  role_name: me?.security?.role_name || me?.role?.name || '',
  permissions: me?.security?.permissions ?? me?.role?.permissions ?? me?.permissions ?? []
})

export type AdminEmailCodePurpose =
  | 'login'
  | 'register'
  | 'reset'
  | 'set_passkey'
  | 'delete_passkey'
  | 'set_totp'
  | 'delete_totp'

export type AdminResetTarget = 'password' | 'totp' | 'passkey'

/** 运营端动态验证码（TOTP）暂不开放 */
export const ADMIN_TOTP_ENABLED = false

export type SecurityVerificationMethod = 'password' | 'email_code'

export type PasskeyVerificationMethod = SecurityVerificationMethod

export type PasskeyChallengePurpose = 'login' | 'set' | 'elevate'

/** 安全设置变更的二次验证（邮箱验证码或当前密码）。 */
export interface SecurityVerificationBody {
  verification_method: SecurityVerificationMethod
  email_code?: string
  current_password?: string
}

export const buildEmailCodeVerification = (email_code: string): SecurityVerificationBody => ({
  verification_method: 'email_code',
  email_code
})

/** GET /v1/admin/security/passkey */
export interface AdminPasskey {
  created_at?: string | number
  device_id?: string
  id: number | string
  last_used_at?: string | number
  name: string
}

export interface AdminEmailCodeResult {
  expires_in: number
  resend_after: number
}

export interface PublicKeyCredentialRequestOptionsJSON
  extends Omit<PublicKeyCredentialRequestOptions, 'challenge' | 'allowCredentials'> {
  challenge: string
  allowCredentials?: Array<Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string }>
}

export interface PublicKeyCredentialCreationOptionsJSON {
  rp: { name: string; id: string }
  user: { name: string; displayName: string; id: string }
  challenge: string
  pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>
  timeout?: number
  authenticatorSelection?: {
    authenticatorAttachment?: AuthenticatorAttachment
    requireResidentKey?: boolean
    residentKey?: ResidentKeyRequirement
    userVerification?: UserVerificationRequirement
  }
  excludeCredentials?: Array<Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string }>
  attestation?: AttestationConveyancePreference
}

export interface PasskeyPublicKeyEnvelope<T> {
  publicKey: T
}

/** Challenge 接口：options.publicKey 才是浏览器凭据参数。 */
export interface PasskeyChallengeResult {
  ceremony_id: string
  options:
    | PublicKeyCredentialRequestOptionsJSON
    | PublicKeyCredentialCreationOptionsJSON
    | PasskeyPublicKeyEnvelope<
        PublicKeyCredentialRequestOptionsJSON | PublicKeyCredentialCreationOptionsJSON
      >
}

/** 提交给 go-webauthn 的浏览器凭据，对应 protocol.CredentialCreation/AssertionResponse。 */
export interface PasskeyCredentialPayload {
  id: string
  rawId: string
  type: string
  authenticatorAttachment?: string
  clientExtensionResults?: Record<string, unknown>
  response: {
    clientDataJSON: string
    attestationObject?: string
    authenticatorData?: string
    signature?: string
    userHandle?: string
    transports?: string[]
  }
}

/** 通行密钥断言：登录、elevate 以及业务接口二次验证共用。 */
export interface PasskeyAssertionBody {
  ceremony_id: string
  credential: PasskeyCredentialPayload
  device_id: string
}

/** 登记通行密钥：WebAuthn 注册凭据 + 二次验证。 */
export type PasskeyRegistrationBody = SecurityVerificationBody & {
  ceremony_id: string
  credential: PasskeyCredentialPayload
  name: string
}

export const withPasskeyAssertion = <T extends object>(
  data: T,
  assertion: PasskeyAssertionBody
): T & PasskeyAssertionBody => ({ ...data, ...assertion })
