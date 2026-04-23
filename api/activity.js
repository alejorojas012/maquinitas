import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const state = await redis.get('machines:state') || {}
    const codes = Object.keys(state)

    const allEvents = []

    for (const code of codes) {
      const history = await redis.lrange(`history:${code}`, 0, 19)
      for (const item of history) {
        try {
          const parsed = typeof item === 'string' ? JSON.parse(item) : item
          allEvents.push({ ...parsed, code })
        } catch {}
      }
    }

    // Ordenar por timestamp descendente
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return res.status(200).json({ ok: true, events: allEvents.slice(0, 30) })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}