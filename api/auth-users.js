import { Redis } from '@upstash/redis'
const redis = Redis.fromEnv()
async function verifyAdmin(req) {
  const token = req.headers['x-auth-token']
  if (!token) return false
  const email = await redis.get('session:' + token)
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
        const userRaw = await redis.get('user:' + email)
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
      if (action === 'deleted') {
        await redis.del('user:' + email)
        const emails = await redis.lrange('users:list', 0, -1)
        const filtered = emails.filter(function(e) { return e !== email })
        await redis.del('users:list')
        for (const e of filtered) await redis.lpush('users:list', e)
        return res.status(200).json({ ok: true, action, email })
      }
      const userRaw = await redis.get('user:' + email)
      if (!userRaw) return res.status(404).json({ error: 'Usuario no encontrado' })
      const user = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw
      user.status = action
      await redis.set('user:' + email, JSON.stringify(user))
      const isApproved = action === 'approved'
      const subject = isApproved ? 'Acceso aprobado - Maquinitas' : 'Solicitud rechazada - Maquinitas'
      const mensaje = isApproved ? 'Tu solicitud fue aprobada. Ya puedes iniciar sesion.' : 'Tu solicitud fue rechazada.'
      const linkHtml = isApproved ? '<a href="https://maquinitas.vercel.app">Entrar a Maquinitas</a>' : ''
      const html = '<div style="font-family:sans-serif;background:#0f172a;color:#fff;padding:24px">' + '<h2>' + (isApproved ? 'Acceso aprobado' : 'Solicitud rechazada') + '</h2>' + '<p>' + mensaje + '</p>' + linkHtml + '</div>'
      await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'Maquinitas <onboarding@resend.dev>', to: [email], subject, html }) })
      return res.status(200).json({ ok: true, action, email })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }
}