import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req, res) {
  try {
    const base = 'https://maquinitas.vercel.app'
    const now = new Date().toISOString()
    const monthKey = now.slice(0, 7) // "2026-04"

    // Obtener máquinas
    const response = await fetch(
      `${base}/api/gw/merchant/equipmentManage/equipmentPage?current=1&size=50&online=&storeShowType=down`
    )
    const data = await response.json()
    const machines = data?.body?.records || []

    // Obtener estado anterior guardado
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
        storeName: m.storeName,
      }

      // Si estaba online y ahora está offline → nueva desconexión
      if (wasOnline && !isOnline) {
        newOffline.push(m)
        // Incrementar contador de desconexiones del mes
        await redis.incr(`disconnections:${key}:${monthKey}`)
        // Guardar en historial
        await redis.lpush(`history:${key}`, JSON.stringify({
          event: 'offline',
          timestamp: now,
          storeName: m.storeName,
        }))
        await redis.ltrim(`history:${key}`, 0, 99) // máximo 100 eventos
      }

      // Si estaba offline y ahora está online → reconexión
      if (!wasOnline && isOnline) {
        await redis.lpush(`history:${key}`, JSON.stringify({
          event: 'online',
          timestamp: now,
          storeName: m.storeName,
        }))
        await redis.ltrim(`history:${key}`, 0, 99)
      }
    }

    // Guardar nuevo estado
    await redis.set('machines:state', newState)

    // Enviar email solo si hay nuevas desconexiones
    if (newOffline.length > 0) {
      const lista = newOffline.map(m =>
        `• ${m.storeName || '—'} (${m.equipmentCode || '—'})`
      ).join('\n')

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Maquinitas <onboarding@resend.dev>',
          to: [process.env.ALERT_EMAIL],
          subject: `⚠️ ${newOffline.length} máquina(s) se desconectaron`,
          text: `Las siguientes máquinas se acaban de desconectar:\n\n${lista}\n\nRevisa el dashboard: https://maquinitas.vercel.app`,
          html: `
            <h2>⚠️ Máquinas desconectadas</h2>
            <p>Las siguientes máquinas se acaban de desconectar:</p>
            <ul>
              ${newOffline.map(m => `<li><strong>${m.storeName || '—'}</strong> (${m.equipmentCode || '—'})</li>`).join('')}
            </ul>
            <p><a href="https://maquinitas.vercel.app">Ver dashboard</a></p>
          `,
        })
      })
    }

    return res.status(200).json({
      ok: true,
      checked: machines.length,
      newOffline: newOffline.length,
      emailSent: newOffline.length > 0,
      timestamp: now,
    })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}