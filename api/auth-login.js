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

    const { email, password } = body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseÃ±a son requeridos' })
    }

    const userRaw = await redis.get(`user:${email}`)
    if (!userRaw) {
      return res.status(401).json({ error: 'Email o contraseÃ±a incorrectos' })
    }

    const user = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw

    if (user.status === 'pending' && email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Tu cuenta esta pendiente de aprobacion. Te notificaremos cuando el administrador la apruebe.' })
    }

    if (user.status === 'rejected' && email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Tu solicitud de acceso fue rechazada. Contacta al administrador.' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Email o contraseÃ±a incorrectos' })
    }

    // Crear token de sesion simple
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64')
    await redis.set(`session:${token}`, email, { ex: 60 * 60 * 24 * 7 }) // 7 dias

    return res.status(200).json({
      ok: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        isAdmin: email === process.env.ADMIN_EMAIL,
      }
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

