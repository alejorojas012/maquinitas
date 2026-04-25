export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    let body = req.body
    if (typeof body === 'string') body = JSON.parse(body)

    const { code, active } = body
    if (!code) return res.status(400).json({ error: 'code requerido' })

    const value = active ? '1' : '0'

    // Usar REST directo de Upstash en lugar del SDK
    const url = `${process.env.KV_REST_API_URL}/set/monitor:${code}/${value}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      }
    })

    const data = await response.json()

    return res.status(200).json({ ok: true, code, active, redis: data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}