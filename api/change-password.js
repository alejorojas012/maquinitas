import { Redis } from '@upstash/redis'
import bcrypt from 'bcryptjs'

const redis = Redis.fromEnv()

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    let body = req.body
    if (typeof body === 'string') body = JSON.parse(body)

    const { email, newPassword, adminKey } = body

    // Verificar clave de admin
    if (adminKey !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const userRaw = await redis.get(`user:${email}`)
    if (!userRaw) return res.status(404).json({ error: 'Usuario no encontrado' })

    const user = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw
    user.password = await bcrypt.hash(newPassword, 10)
    user.status = 'approved'

    await redis.set(`user:${email}`, JSON.stringify(user))

    return res.status(200).json({ ok: true, message: 'Contrasena actualizada' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}