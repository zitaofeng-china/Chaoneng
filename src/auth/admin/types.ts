export interface AdminSession {
  access_expires_at: string
  access_token: string
  refresh_expires_at: string
  token_type: 'Bearer'
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

export interface PasskeyCredentialPayload {
  attestation_object?: string
  authenticator_data?: string
  client_data_json: string
  id: string
  raw_id: string
  signature?: string
  type: string
  user_handle?: string
}
