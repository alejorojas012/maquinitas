import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    let body = req.body
    if (typeof body === 'string') {
      body = JSON.parse(body)
    }

    const { code, active } = body
    if (!code) return res.status(400).json({ error: 'code requerido' })

    await redis.set(`monitor:${code}`, active ? '1' : '0')

    return res.status(200).json({ ok: true, code, active })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}