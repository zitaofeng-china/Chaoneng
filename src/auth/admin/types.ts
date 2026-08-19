export type UnixTimestamp = number | string

export interface AdminSession {
  access_expires_at: UnixTimestamp
  access_token: string
  refresh_expires_at: UnixTimestamp
  token_type: 'Bearer'
}

/** 登录/刷新返回的 unix 秒；兼容毫秒和数字字符串。 */
export const parseUnixSeconds = (value?: UnixTimestamp | null): number | undefined => {
  if (value == null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n)
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
  passkey_enabled?: boolean
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
  passkey_enabled?: boolean
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

export const getAdminSecurity = (me?: AdminMe | null) => ({
  current_auth_method: me?.security?.current_auth_method || me?.current_auth_method || '',
  passkey_enabled: Boolean(me?.security?.passkey_enabled ?? me?.passkey_enabled),
  totp_enabled: Boolean(me?.security?.totp_enabled),
  role_name: me?.security?.role_name || me?.role?.name || '',
  permissions: me?.security?.permissions ?? me?.role?.permissions ?? me?.permissions ?? []
})

export type AdminEmailCodePurpose =
  | 'register'
  | 'reset'
  | 'set_passkey'
  | 'delete_passkey'
  | 'set_totp'
  | 'delete_totp'

export type AdminResetTarget = 'password' | 'totp' | 'passkey'

export type SecurityVerificationMethod = 'password' | 'email_code'

export type PasskeyVerificationMethod = SecurityVerificationMethod

export type PasskeyChallengePurpose = 'login' | 'set'

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
