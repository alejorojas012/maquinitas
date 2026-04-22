export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const apiPath = req.url.replace(/^\/api/, '')
  const target = `https://gb.starthing.com/gw/merchant${apiPath}`

  const token = req.headers['ram-token'] || process.env.RAM_TOKEN
  const system = req.headers['ram-system'] || process.env.RAM_SYSTEM
  const tenant = req.headers['ram-tenant'] || process.env.RAM_TENANT

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