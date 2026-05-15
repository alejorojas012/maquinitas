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

    const { name, email, password } = body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' })
    }

    // Verificar si el email ya existe
    const existing = await redis.get(`user:${email}`)
    if (existing) {
      return res.status(400).json({ error: 'Este email ya está registrado' })
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Guardar usuario pendiente
    const user = {
      name,
      email,
      password: hashedPassword,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    await redis.set(`user:${email}`, JSON.stringify(user))
    await redis.lpush('users:list', email)

    // Enviar email al admin
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Maquinitas <onboarding@resend.dev>',
        to: [process.env.ALERT_EMAIL],
        subject: `Nuevo usuario solicita acceso: ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#fff;padding:24px;border-radius:12px">
            <h2 style="color:#22c55e;margin-top:0">Nuevo usuario solicita acceso</h2>
            <p style="color:#94a3b8">Detalles del usuario:</p>
            <ul style="color:#fff">
              <li><strong>Nombre:</strong> ${name}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
            </ul>
            <a href="https://maquinitas.vercel.app" style="display:inline-block;background:#22c55e;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">
              Ir al panel de admin
            </a>
          </div>
        `,
      })
    })

    return res.status(200).json({ ok: true, message: 'Solicitud enviada. Espera la aprobacion del administrador.' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}