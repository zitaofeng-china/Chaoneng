/**
 * Netlify API 代理：将 /.netlify/functions/api/* 转发到真实后端
 *
 * 必须在 Netlify 站点环境变量中配置其一：
 * - API_BASE_URL
 * - VITE_API_BASE_PATH
 *
 * 例如：API_BASE_URL=http://47.84.135.181:8888
 * 注意：不要回退到 process.env.URL（那是 Netlify 站点自身地址，会导致自代理/502）
 */
const API_BASE_URL = (process.env.API_BASE_URL || process.env.VITE_API_BASE_PATH || '').trim()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
}

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    ...corsHeaders
  },
  body: JSON.stringify(body)
})

exports.handler = async (event) => {
  if (!API_BASE_URL) {
    console.error('API proxy misconfigured: API_BASE_URL / VITE_API_BASE_PATH is empty')
    return jsonResponse(502, {
      code: '502',
      msg: '测试站未配置 API_BASE_URL，无法代理 /v1 /v2 请求。请在 Netlify → Site configuration → Environment variables 中设置 API_BASE_URL 为后端地址（如 http://47.84.135.181:8888）后重新部署。'
    })
  }

  // 路径示例: /.netlify/functions/api/v1/captcha → /v1/captcha
  const path = (event.path || '').replace(/^\/\.netlify\/functions\/api/, '') || '/'

  let apiUrl = `${API_BASE_URL.replace(/\/$/, '')}${path}`
  if (event.queryStringParameters && Object.keys(event.queryStringParameters).length > 0) {
    const queryString = new URLSearchParams(event.queryStringParameters).toString()
    apiUrl += `?${queryString}`
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  try {
    const headers = {}

    if (event.headers['content-type']) {
      headers['Content-Type'] = event.headers['content-type']
    }
    if (event.headers.authorization) {
      headers['Authorization'] = event.headers.authorization
    }

    const fetchOptions = {
      method: event.httpMethod,
      headers
    }

    if (event.body) {
      fetchOptions.body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body
    }

    const response = await fetch(apiUrl, fetchOptions)
    const data = await response.text()

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        ...corsHeaders
      },
      body: data
    }
  } catch (error) {
    console.error('API Proxy Error:', { apiUrl, message: error.message, stack: error.stack })

    return jsonResponse(502, {
      code: '502',
      msg: 'Netlify 代理无法连接后端，请检查 API_BASE_URL 是否公网可达，以及后端是否放行 Netlify 出口 IP',
      error: error.message,
      target: apiUrl
    })
  }
}
