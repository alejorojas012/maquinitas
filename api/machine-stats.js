export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const monthKey = new Date().toISOString().slice(0, 7)
    const baseUrl = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN

    // Leer machines:state via REST directo
    const stateRes = await fetch(`${baseUrl}/get/machines:state`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const stateData = await stateRes.json()
    const state = typeof stateData.result === 'string' 
      ? JSON.parse(stateData.result) 
      : (stateData.result || {})

    const stats = {}
    for (const [code, data] of Object.entries(state)) {
      // Leer disconnections via REST directo
      const discRes = await fetch(`${baseUrl}/get/disconnections:${code}:${monthKey}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const discData = await discRes.json()
      const disconnections = discData.result || 0

      // Leer monitor via REST directo
      const monRes = await fetch(`${baseUrl}/get/monitor:${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const monData = await monRes.json()
      const active = monData.result === null ? true : monData.result === '1'

      stats[code] = {
        ...data,
        disconnectionsThisMonth: Number(disconnections),
        active,
      }
    }

    return res.status(200).json({ ok: true, stats })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}