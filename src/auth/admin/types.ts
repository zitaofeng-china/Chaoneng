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

export interface AdminEmailCodeResult {
  expires_in: number
  resend_after: number
}

export interface PasskeyChallengeResult {
  ceremony_id: string
  options: PublicKeyCredentialRequestOptionsJSON
}

export interface PublicKeyCredentialRequestOptionsJSON
  extends Omit<PublicKeyCredentialRequestOptions, 'challenge' | 'allowCredentials'> {
  challenge: string
  allowCredentials?: Array<Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string }>
}

export interface PublicKeyCredentialCreationOptionsJSON
  extends Omit<PublicKeyCredentialCreationOptions, 'challenge' | 'user' | 'excludeCredentials'> {
  challenge: string
  excludeCredentials?: Array<Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string }>
  user: Omit<PublicKeyCredentialUserEntity, 'id'> & { id: string }
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
