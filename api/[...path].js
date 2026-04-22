async function autoLogin() {
  const response = await fetch('https://maquinitas.vercel.app/api/auth')
  const data = await response.json()
  return {
    token: data?.token || null,
    tenantId: data?.tenantId || null,
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
    return res.status(200).json({ debug: true, target, token: token.slice(0,10) + '...', tenantId, data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}