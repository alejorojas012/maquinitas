export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    let body = req.body
    if (typeof body === 'string') body = JSON.parse(body)

    const { code, active, type } = body
    if (!code) return res.status(400).json({ error: 'code requerido' })

    const kvUrl = process.env.KV_REST_API_URL
    const kvToken = process.env.KV_REST_API_TOKEN
    const value = active ? '1' : '0'
    const key = type === 'system' ? `enabled:${code}` : `monitor:${code}`

    const url = `${kvUrl}/set/${encodeURIComponent(key)}/${value}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${kvToken}` }
    })
    const data = await response.json()

    return res.status(200).json({ ok: true, code, active, type, redis: data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}