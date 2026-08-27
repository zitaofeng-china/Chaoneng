const cache = new Map<string, string>()

const LOCAL_LABEL = '本地'
const LAN_LABEL = '内网'
const UNKNOWN_LABEL = '未知地址'

const isBlank = (value?: string) => {
  const text = String(value || '').trim()
  return !text || text === '-' || text === 'XX' || text.toLowerCase() === 'unknown'
}

const COUNTRY_ZH: Record<string, string> = {
  CN: '中国',
  China: '中国',
  HK: '中国香港',
  'Hong Kong': '中国香港',
  JP: '日本',
  Japan: '日本',
  KR: '韩国',
  'South Korea': '韩国',
  SG: '新加坡',
  Singapore: '新加坡',
  TW: '中国台湾',
  Taiwan: '中国台湾',
  GB: '英国',
  'United Kingdom': '英国',
  US: '美国',
  'United States': '美国'
}

const normalizePart = (value?: string) => (isBlank(value) ? '' : String(value).trim())

const localizeCountry = (country: string) => {
  if (!country) return ''
  return COUNTRY_ZH[country] || COUNTRY_ZH[country.toUpperCase()] || country
}

const isChina = (country: string) => country === '中国'

export const privateIpLocation = (ip?: string) => {
  const value = String(ip || '').trim()
  if (!value) return ''
  if (
    value === '127.0.0.1' ||
    value === '::1' ||
    value === 'localhost' ||
    value === '0.0.0.0' ||
    value === '::'
  ) {
    return LOCAL_LABEL
  }
  if (
    /^10\./.test(value) ||
    /^192\.168\./.test(value) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
    /^169\.254\./.test(value) ||
    /^fc/i.test(value) ||
    /^fd/i.test(value) ||
    /^fe80:/i.test(value)
  ) {
    return LAN_LABEL
  }
  return ''
}

export const composeIpAddress = (city?: string, region?: string, country?: string) => {
  const nextCity = normalizePart(city)
  const nextRegion = normalizePart(region)
  const nextCountry = localizeCountry(normalizePart(country))
  const place =
    nextCity && nextRegion && nextCity !== nextRegion ? nextCity : nextCity || nextRegion

  if (isChina(nextCountry)) return place || '中国'
  if (place && nextCountry && place !== nextCountry) return `${place} ${nextCountry}`
  return place || nextCountry
}

const fetchJson = async (url: string, timeout = 4000) => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(String(response.status))
    return (await response.json()) as Record<string, unknown>
  } finally {
    window.clearTimeout(timer)
  }
}

const fromUserAgentInfo = async (ip: string) => {
  const data = await fetchJson(`https://ip.useragentinfo.com/json?ip=${encodeURIComponent(ip)}`)
  return composeIpAddress(
    String(data.city || ''),
    String(data.province || data.region || ''),
    String(data.country || data.short_name || data.country_code || '')
  )
}

const fromIpWho = async (ip: string) => {
  const data = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`)
  if (data.success === false) return ''
  return composeIpAddress(
    String(data.city || ''),
    String(data.region || data.regionName || ''),
    String(data.country || data.country_code || '')
  )
}

const lookupOne = async (ip: string) => {
  const local = privateIpLocation(ip)
  if (local) return local
  const cached = cache.get(ip)
  if (cached) return cached

  let address = ''
  try {
    address = await fromIpWho(ip)
  } catch {
    address = ''
  }
  if (!address) {
    try {
      address = await fromUserAgentInfo(ip)
    } catch {
      address = ''
    }
  }

  const resolved = address || UNKNOWN_LABEL
  cache.set(ip, resolved)
  return resolved
}

export const resolveIpLocationSync = (ip?: string) => {
  const value = String(ip || '').trim()
  if (!value) return ''
  return privateIpLocation(value) || cache.get(value) || ''
}

export const lookupIpLocations = async (ips: string[]) => {
  const result: Record<string, string> = {}
  const unique = [...new Set(ips.map((item) => String(item || '').trim()).filter(Boolean))]
  await Promise.all(
    unique.map(async (ip) => {
      result[ip] = await lookupOne(ip)
    })
  )
  return result
}
