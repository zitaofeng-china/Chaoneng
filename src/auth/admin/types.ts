export interface AdminSession {
  access_expires_at: string
  access_token: string
  refresh_expires_at: string
  token_type: 'Bearer'
}

export type AdminEmailCodePurpose = 'register' | 'reset_password' | 'set_passkey'

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
