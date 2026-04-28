export default async function handler(req, res) {
  try {
    const base = 'https://maquinitas.vercel.app'
    const now = new Date()
    const kvUrl = process.env.KV_REST_API_URL
    const kvToken = process.env.KV_REST_API_TOKEN

    const offsetColombia = -5 * 60
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const colombia = new Date(utc + offsetColombia * 60000)
    const horasColombia = colombia.getHours()
    const minutosColombia = colombia.getMinutes()
    const totalMinutos = horasColombia * 60 + minutosColombia
    const horaLocal = colombia.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    const nowIso = now.toISOString()
    const monthKey = nowIso.slice(0, 7)

    const enHorario = totalMinutos >= 360 && totalMinutos < 1470
    const esInicioHorario = totalMinutos >= 360 && totalMinutos < 390

    async function kvGet(key) {
      const r = await fetch(`${kvUrl}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      })
      const d = await r.json()
      return d.result
    }

    async function kvSet(key, value) {
      const encoded = encodeURIComponent(typeof value === 'object' ? JSON.stringify(value) : String(value))
      await fetch(`${kvUrl}/set/${encodeURIComponent(key)}/${encoded}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      })
    }

    async function kvIncr(key) {
      await fetch(`${kvUrl}/incr/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      })
    }

    async function kvLpush(key, value) {
      await fetch(`${kvUrl}/lpush/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      })
    }

    async function kvLtrim(key, start, stop) {
      await fetch(`${kvUrl}/ltrim/${encodeURIComponent(key)}/${start}/${stop}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      })
    }

    async function sendEmail(subject, html) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Maquinitas <onboarding@resend.dev>',
          to: [process.env.ALERT_EMAIL],
          subject,
          html,
        })
      })
    }

    const response = await fetch(
      `${base}/api/gw/merchant/equipmentManage/equipmentPage?current=1&size=50&online=&storeShowType=down`
    )
    const data = await response.json()
    const machines = data?.body?.records || []

    const prevStateRaw = await kvGet('machines:state')
    const prevState = prevStateRaw
      ? (typeof prevStateRaw === 'string' ? JSON.parse(prevStateRaw) : prevStateRaw)
      : {}

    const newOffline = []
    const newOnline = []
    const stillOffline = []
    const newState = {}

    for (const m of machines) {
      const key = m.equipmentCode
      const wasOnline = prevState[key]?.online ?? true
      const isOnline = m.online

      const monitorRaw = await kvGet(`monitor:${key}`)
      const active = monitorRaw === null ? true : monitorRaw === '1'

      newState[key] = {
        online: isOnline,
        lastSeen: isOnline ? nowIso : (prevState[key]?.lastSeen || nowIso),
        offlineSince: !isOnline && wasOnline ? nowIso : (!isOnline ? prevState[key]?.offlineSince || nowIso : null),
        storeName: m.storeName,
        active,
      }

      if (wasOnline && !isOnline && active) {
        newOffline.push(m)
        await kvIncr(`disconnections:${key}:${monthKey}`)
        await kvLpush(`history:${key}`, JSON.stringify({ event: 'offline', timestamp: nowIso, storeName: m.storeName }))
        await kvLtrim(`history:${key}`, 0, 99)
      }

      if (!wasOnline && isOnline && active) {
        newOnline.push(m)
        await kvLpush(`history:${key}`, JSON.stringify({ event: 'online', timestamp: nowIso, storeName: m.storeName }))
        await kvLtrim(`history:${key}`, 0, 99)
      }

      if (!isOnline && active && esInicioHorario) {
        stillOffline.push(m)
      }
    }

    await kvSet('machines:state', newState)

    if (newOffline.length > 0 && enHorario) {
      await sendEmail(
        `⚠️ ${newOffline.length} máquina(s) desconectadas`,
        `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#fff;padding:24px;border-radius:12px">
          <h2 style="color:#ef4444;margin-top:0">⚠️ Máquinas desconectadas</h2>
          <p style="color:#94a3b8">Detectadas a las ${horaLocal} (hora Colombia):</p>
          <ul>${newOffline.map(m => `<li><strong>${m.storeName}</strong> (${m.equipmentCode})</li>`).join('')}</ul>
          <a href="https://maquinitas.vercel.app" style="display:inline-block;background:#ef4444;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">Ver dashboard</a>
        </div>`
      )
    }

    if (newOnline.length > 0 && enHorario) {
      await sendEmail(
        `✅ ${newOnline.length} máquina(s) reconectadas`,
        `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#fff;padding:24px;border-radius:12px">
          <h2 style="color:#22c55e;margin-top:0">✅ Máquinas reconectadas</h2>
          <p style="color:#94a3b8">Reconectadas a las ${horaLocal} (hora Colombia):</p>
          <ul>${newOnline.map(m => `<li><strong>${m.storeName}</strong> (${m.equipmentCode})</li>`).join('')}</ul>
          <a href="https://maquinitas.vercel.app" style="display:inline-block;background:#22c55e;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">Ver dashboard</a>
        </div>`
      )
    }

    if (stillOffline.length > 0) {
      await sendEmail(
        `🌅 ${stillOffline.length} máquina(s) offline al iniciar operación`,
        `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#fff;padding:24px;border-radius:12px">
          <h2 style="color:#f59e0b;margin-top:0">🌅 Máquinas offline al inicio del día</h2>
          <p style="color:#94a3b8">Las siguientes máquinas están offline a las ${horaLocal} (inicio de operación):</p>
          <ul>${stillOffline.map(m => `<li><strong>${m.storeName}</strong> (${m.equipmentCode})</li>`).join('')}</ul>
          <a href="https://maquinitas.vercel.app" style="display:inline-block;background:#f59e0b;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">Ver dashboard</a>
        </div>`
      )
    }

    return res.status(200).json({
      ok: true,
      checked: machines.length,
      newOffline: newOffline.length,
      newOnline: newOnline.length,
      stillOffline: stillOffline.length,
      emailSent: (newOffline.length > 0 || newOnline.length > 0 || stillOffline.length > 0) && (enHorario || esInicioHorario),
      enHorario,
      esInicioHorario,
      timestamp: nowIso,
    })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}