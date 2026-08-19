export interface AdminSession {
  access_expires_at: string
  access_token: string
  refresh_expires_at: string
  token_type: 'Bearer'
}

export interface AdminNotify {
  balance_threshold?: number | string
  chat_ids?: number[]
  chat_id?: number | number[]
  order_subscription?: number[] | null
}

export interface AdminRole {
  created_at?: string | number
  id?: number
  name?: string
  permissions?: Array<string | number> | null
  status?: number
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
  status?: number
  trx_balance?: number | string
  updated_at?: string | number
  username?: string
}

export type AdminEmailCodePurpose = 'register' | 'reset_password' | 'set_passkey' | 'delete_passkey'

export type PasskeyVerificationMethod = 'password' | 'email_code'

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
