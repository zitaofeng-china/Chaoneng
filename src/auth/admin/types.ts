export interface AdminSession {
  access_expires_at: string
  access_token: string
  refresh_expires_at: string
  token_type: 'Bearer'
}
