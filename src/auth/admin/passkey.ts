import type {
  PasskeyCredentialPayload,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON
} from './types'

const deviceStorageKey = 'admin-passkey-device-id'

const encodeBase64Url = (buffer: ArrayBuffer | null) => {
  if (!buffer) return undefined
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return bytes.buffer
}

export const getPasskeyDeviceId = () => {
  let deviceId = localStorage.getItem(deviceStorageKey)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(deviceStorageKey, deviceId)
  }
  return deviceId
}

export const isPasskeySupported = () =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  typeof PublicKeyCredential !== 'undefined' &&
  Boolean(navigator.credentials)

export const getPasskeyAssertion = async (
  options: PublicKeyCredentialRequestOptionsJSON
): Promise<PasskeyCredentialPayload> => {
  const credential = (await navigator.credentials.get({
    publicKey: {
      ...options,
      challenge: decodeBase64Url(options.challenge),
      allowCredentials: options.allowCredentials?.map((descriptor) => ({
        ...descriptor,
        id: decodeBase64Url(descriptor.id)
      }))
    }
  })) as PublicKeyCredential | null

  if (!credential || !(credential.response instanceof AuthenticatorAssertionResponse)) {
    throw new Error('未获取到通行密钥凭据')
  }

  const response = credential.response
  return {
    id: credential.id,
    raw_id: encodeBase64Url(credential.rawId) || '',
    type: credential.type,
    authenticator_data: encodeBase64Url(response.authenticatorData) || '',
    client_data_json: encodeBase64Url(response.clientDataJSON) || '',
    signature: encodeBase64Url(response.signature) || '',
    user_handle: encodeBase64Url(response.userHandle)
  }
}

export const createPasskeyCredential = async (
  options: PublicKeyCredentialCreationOptionsJSON
): Promise<PasskeyCredentialPayload> => {
  const credential = (await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: decodeBase64Url(options.challenge),
      user: { ...options.user, id: decodeBase64Url(options.user.id) },
      excludeCredentials: options.excludeCredentials?.map((descriptor) => ({
        ...descriptor,
        id: decodeBase64Url(descriptor.id)
      }))
    }
  })) as PublicKeyCredential | null

  if (!credential || !(credential.response instanceof AuthenticatorAttestationResponse)) {
    throw new Error('未创建通行密钥凭据')
  }
  const response = credential.response
  return {
    id: credential.id,
    raw_id: encodeBase64Url(credential.rawId) || '',
    type: credential.type,
    client_data_json: encodeBase64Url(response.clientDataJSON) || '',
    attestation_object: encodeBase64Url(response.attestationObject) || ''
  }
}
