import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const monthKey = new Date().toISOString().slice(0, 7)
    const state = await redis.get('machines:state') || {}

    const stats = {}
    for (const [code, data] of Object.entries(state)) {
      const disconnections = await redis.get(`disconnections:${code}:${monthKey}`) || 0
      const monitorRaw = await redis.get(`monitor:${code}`)
      const active = monitorRaw === null ? true : monitorRaw === '1'
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