const ANON_TOKEN = '26b1d833b6304df8abf546d66e38f2221496452109635682304'

let cachedToken = null
let tokenExpiry = 0

async function doLogin() {
  const loginRes = await fetch('https://gb.starthing.com/gw/merchant/common/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ram-System': process.env.RAM_SYSTEM,
      'Ram-Tenant': process.env.RAM_TENANT,
      'Ram-Token': ANON_TOKEN,
      'X-Accept-Language': 'es',
    },
    body: JSON.stringify({
      account: process.env.ST_ACCOUNT,
      password: process.env.ST_PASSWORD,
      clientType: 'h5',
      companyCode: 'STAR_THING',
      productCode: 'EQUIPMENT_MANAGEMENT_H5',
      serviceCode: 'MCH_LOGIN',
      userTypeCode: 'MERCHANT',
      verifyCode: 47712,
    }),
  })
  return await loginRes.json()
}

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken
  const data = await doLogin()
  if (data.code === '0000000' && data.body?.token) {
    cachedToken = data.body.token
    tokenExpiry = Date.now() + 60 * 60 * 1000
    return cachedToken
  }
  throw new Error('Login fallido: ' + JSON.stringify(data))
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.url.includes('/api/debug-login')) {
    const result = await doLogin()
    return res.status(200).json(result)
  }

  const apiPath = req.url.replace(/^\/api/, '')
  const target = `https://gb.starthing.com/gw/merchant${apiPath}`

  try {
    const token = await getToken()
    const response = await fetch(target, {
      method: 'GET',
      headers: {
        'Ram-System': process.env.RAM_SYSTEM,
        'Ram-Tenant': process.env.RAM_TENANT,
        'Ram-Token': token,
        'X-Accept-Language': 'es',
        'Content-Type': 'application/json',
      },
    })
    const data = await response.json()
    if (data.code === '0000401') {
      cachedToken = null
      tokenExpiry = 0
      const newToken = await getToken()
      const retry = await fetch(target, {
        method: 'GET',
        headers: {
          'Ram-System': process.env.RAM_SYSTEM,
          'Ram-Tenant': process.env.RAM_TENANT,
          'Ram-Token': newToken,
          'X-Accept-Language': 'es',
          'Content-Type': 'application/json',
        },
      })
      return res.status(200).json(await retry.json())
    }
    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}