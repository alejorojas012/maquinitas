export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const url = new URL(req.url, 'http://localhost')
  const token = url.searchParams.get('_token') || process.env.RAM_TOKEN
  const system = process.env.RAM_SYSTEM
  const tenant = process.env.RAM_TENANT

  url.searchParams.delete('_token')
  const cleanPath = url.pathname.replace(/^\/api/, '') + (url.search || '')
  const target = `https://gb.starthing.com/gw/merchant${cleanPath}`

  try {
    const response = await fetch(target, {
      method: 'GET',
      headers: {
        'Ram-System': system,
        'Ram-Tenant': tenant,
        'Ram-Token': token,
        'X-Accept-Language': 'es',
        'Content-Type': 'application/json',
      },
    })
    const data = await response.json()
    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}