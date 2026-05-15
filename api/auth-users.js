import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

async function verifyAdmin(req) {
  const token = req.headers['x-auth-token']
  if (!token) return false
  const email = await redis.get(`session:${token}`)
  return email === process.env.ADMIN_EMAIL
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const isAdmin = await verifyAdmin(req)
  if (!isAdmin) return res.status(403).json({ error: 'No autorizado' })

  if (req.method === 'GET') {
    try {
      const emails = await redis.lrange('users:list', 0, -1)
      const users = []
      for (const email of emails) {
        const userRaw = await redis.get(`user:${email}`)
        if (userRaw) {
          const user = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw
          users.push({ name: user.name, email: user.email, status: user.status, createdAt: user.createdAt })
        }
      }
      return res.status(200).json({ ok: true, users })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'POST') {
    try {
      let body = req.body
      if (typeof body === 'string') body = JSON.parse(body)
      const { email, action } = body

      const userRaw = await redis.get(`user:${email}`)
      if (!userRaw) return res.status(404).json({ error: 'Usuario no encontrado' })

      const user = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw
      user.status = action // 'approved' o 'rejected'
      await redis.set(`user:${email}`, JSON.stringify(user))

      // Notificar al usuario
      const mensaje = action === 'approved'
        ? 'Tu solicitud de acceso a Maquinitas fue aprobada. Ya puedes iniciar sesion.'
        : 'Tu solicitud de acceso a Maquinitas fue rechazada. Contacta al administrador para mas informacion.'

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Maquinitas <onboarding@resend.dev>',
          to: [email],
          subject: action === 'approved' ? 'Acceso aprobado - Maquinitas' : 'Solicitud rechazada - Maquinitas',
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#fff;padding:24px;border-radius:12px">
              <h2 style="color:${action === 'approved' ? '#22c55e' : '#ef4444'};margin-top:0">
                ${action === 'approved' ? 'Acceso aprobado' : 'Solicitud rechazada'}
              </h2>
              <p style="color:#94a3b8">${mensaje}</p>
              ${action === 'approved' ? `<a href="https://maquinitas.vercel.app" style="display:inline-block;background:#22c55e;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">Entrar a Maquinitas</a>` : ''}
            </div>
          `,
        })
      })

      return res.status(200).json({ ok: true, action, email })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }
}