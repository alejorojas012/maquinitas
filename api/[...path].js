export default async function handler(req, res) {
  const apiPath = req.url.replace(/^\/api/, '')
  const target = `https://gb.starthing.com/gw/merchant${apiPath}`

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const response = await fetch(target, {
      method: 'GET',
      headers: {
        'Ram-System': process.env.VITE_RAM_SYSTEM,
        'Ram-Tenant': process.env.VITE_RAM_TENANT,
        'Ram-Token': process.env.VITE_RAM_TOKEN,
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