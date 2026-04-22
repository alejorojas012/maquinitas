async function autoLogin() {
  try {
    const response = await fetch('https://gb.starthing.com/gw/merchant/common/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Accept-Language': 'es',
        'Ram-System': process.env.RAM_SYSTEM,
        'Ram-Tenant': process.env.RAM_TENANT,
        'Referer': 'https://gb.starthing.com/',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
      },
      body: JSON.stringify({
        account: process.env.ST_ACCOUNT,
        password: process.env.ST_PASSWORD,
        _notSave_password: process.env.ST_PASSWORD_PLAIN,
        clientType: 'h5',
        companyCode: 'STAR_THING',
        productCode: 'EQUIPMENT_MANAGEMENT_H5',
        serviceCode: 'MCH_LOGIN',
        userTypeCode: 'MERCHANT',
        verifyCode: 47712,
      })
    })
    const data = await response.json()
    return {
      token: data?.body?.token || null,
      tenantId: data?.body?.tenantId || null,
    }
  } catch {
    return { token: null, tenantId: null }
  }
}

async function callAPI(target, token, tenantId) {
  return await fetch(target, {
    method: 'GET',
    headers: {
      'Ram-System': process.env.RAM_SYSTEM,
      'Ram-Tenant': tenantId || process.env.RAM_TENANT,
      'Ram-Token': token,
      'X-Accept-Language': 'es',
      'Content-Type': 'application/json',
      'Referer': 'https://gb.starthing.com/',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
    }
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const url = new URL(req.url, 'http://localhost')
  const cleanPath = url.pathname.replace(/^\/api/, '') + (url.search || '')
  const target = `https://gb.starthing.com/gw/merchant${cleanPath}`

  let { token, tenantId } = await autoLogin()

  if (!token) {
    return res.status(401).json({ error: 'No se pudo obtener token' })
  }

  try {
    const response = await callAPI(target, token, tenantId)
    const data = await response.json()

    if (data?.code === '0000401') {
      const retry = await autoLogin()
      if (retry.token) {
        const response2 = await callAPI(target, retry.token, retry.tenantId)
        const data2 = await response2.json()
        return res.status(200).json(data2)
      }
      return res.status(401).json({ error: 'Token inválido después de reintento' })
    }

    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}