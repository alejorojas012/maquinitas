async function autoLogin() {
  try {
    const response = await fetch('https://gb.starthing.com/gw/merchant/common/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Accept-Language': 'es',
        'Ram-System': '114426987931596800',
      },
      body: JSON.stringify({
        account: '3046504500',
        password: 'f8869f779d3a4d096324d1a4f60d4b30',
        _notSave_password: '119119ch',
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
      'Ram-System': '1144269879315968000',
      'Ram-Tenant': tenantId || '140502261224151449',
      'Ram-Token': token,
      'X-Accept-Language': 'es',
      'Content-Type': 'application/json',
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

  // Primer intento con login automático
  let { token, tenantId } = await autoLogin()

 if (!token) {
  return res.status(200).json({ 
    debug: 'autoLogin falló', 
    envVars: {
      hasSystem: !!process.env.RAM_SYSTEM,
      hasTenant: !!process.env.RAM_TENANT,
      hasAccount: !!process.env.ST_ACCOUNT,
      hasPassword: !!process.env.ST_PASSWORD,
      hasPasswordPlain: !!process.env.ST_PASSWORD_PLAIN,
    }
  })
}

  try {
    const response = await callAPI(target, token, tenantId)
    const data = await response.json()

    // Si por alguna razón el token no sirvió, reintenta
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