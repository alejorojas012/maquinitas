import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

function enHorarioOperacion() {
  const ahora = new Date()
  // Hora en Colombia (UTC-5)
  const offsetColombia = -5 * 60
  const utc = ahora.getTime() + ahora.getTimezoneOffset() * 60000
  const colombia = new Date(utc + offsetColombia * 60000)
  
  const horas = colombia.getHours()
  const minutos = colombia.getMinutes()
  const totalMinutos = horas * 60 + minutos

  // Operación: 6:00am (360 min) a 12:30am (1470 min)
  const inicio = 6 * 60        // 360
  const fin = 24 * 60 + 30     // 1470 (12:30am del día siguiente)

  return totalMinutos >= inicio && totalMinutos < fin
}

export default async function handler(req, res) {
  try {
    const base = 'https://maquinitas.vercel.app'
    const now = new Date().toISOString()
    const monthKey = now.slice(0, 7)

    const response = await fetch(
      `${base}/api/gw/merchant/equipmentManage/equipmentPage?current=1&size=50&online=&storeShowType=down`
    )
    const data = await response.json()
    const machines = data?.body?.records || []

    const prevState = await redis.get('machines:state') || {}
    const newOffline = []
    const newState = {}

    for (const m of machines) {
      const key = m.equipmentCode
      const wasOnline = prevState[key]?.online ?? true
      const isOnline = m.online

      newState[key] = {
        online: isOnline,
        lastSeen: isOnline ? now : (prevState[key]?.lastSeen || now),
        offlineSince: !isOnline && wasOnline ? now : (!isOnline ? prevState[key]?.offlineSince || now : null),
        storeName: m.storeName,
      }

      if (wasOnline && !isOnline) {
        newOffline.push(m)
        await redis.incr(`disconnections:${key}:${monthKey}`)
        await redis.lpush(`history:${key}`, JSON.stringify({
          event: 'offline',
          timestamp: now,
          storeName: m.storeName,
        }))
        await redis.ltrim(`history:${key}`, 0, 99)
      }

      if (!wasOnline && isOnline) {
        await redis.lpush(`history:${key}`, JSON.stringify({
          event: 'online',
          timestamp: now,
          storeName: m.storeName,
        }))
        await redis.ltrim(`history:${key}`, 0, 99)
      }
    }

    await redis.set('machines:state', newState)

    // Solo enviar alerta si estamos en horario de operación
    if (newOffline.length > 0 && enHorarioOperacion()) {
      const lista = newOffline.map(m => `• ${m.storeName} (${m.equipmentCode})`).join('\n')

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Maquinitas <onboarding@resend.dev>',
          to: [process.env.ALERT_EMAIL],
          subject: `⚠️ ${newOffline.length} máquina(s) desconectadas`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #0f172a; color: #fff; padding: 24px; border-radius: 12px;">
              <h2 style="color: #ef4444; margin-top: 0;">⚠️ Máquinas desconectadas</h2>
              <p style="color: #94a3b8;">Se detectaron las siguientes desconexiones durante horario de operación:</p>
              <ul style="color: #fff;">
                ${newOffline.map(m => `<li><strong>${m.storeName}</strong> (${m.equipmentCode}) — desconectada a las ${new Date(now).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })}</li>`).join('')}
              </ul>
              <a href="https://maquinitas.vercel.app" style="display: inline-block; background: #22c55e; color: #000; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 12px;">Ver dashboard</a>
            </div>
          `,
        })
      })
    }

    return res.status(200).json({
      ok: true,
      checked: machines.length,
      newOffline: newOffline.length,
      emailSent: newOffline.length > 0 && enHorarioOperacion(),
      enHorario: enHorarioOperacion(),
      timestamp: now,
    })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}