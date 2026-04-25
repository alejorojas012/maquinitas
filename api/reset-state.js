import { Redis } from '@upstash/redis'
const redis = Redis.fromEnv()

export default async function handler(req, res) {
  const state = await redis.get('machines:state') || {}
  const code = req.query.code
  if (code && state[code]) {
    state[code].online = true
    state[code].offlineSince = null
    await redis.set('machines:state', state)
    return res.status(200).json({ ok: true, reset: code, newState: state[code] })
  }
  return res.status(400).json({ error: 'code no encontrado' })
}