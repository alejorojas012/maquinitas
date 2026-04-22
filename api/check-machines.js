async function autoLogin() {
  const response = await fetch('https://maquinitas.vercel.app/api/auth')
  const data = await response.json()
  return {
    token: data?.token || null,
    tenantId: data?.tenantId || null,
  }
}

export default async function handler(req, res) {
  try {
    const { token, tenantId } = await autoLogin()

    if (!token) {
      return res.status(401).json({ error: 'No se pudo obtener token' })
    }

    // Obtener máquinas
    const response = await fetch(
      'https://gb.starthing.com/gw/merchant/equipmentManage/equipmentPage?current=1&size=50&online=&storeShowType=down',
      {
        headers: {
          'Ram-System': process.env.RAM_SYSTEM,
          'Ram-Tenant': tenantId || process.env.RAM_TENANT,
          'Ram-Token': token,
          'X-Accept-Language': 'es',
          'Content-Type': 'application/json',
          'Referer': 'https://gb.starthing.com/',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
        }
      }
    )

    const data = await response.json()
    const machines = data?.body?.records || []
    const offline = machines.filter(m => !m.online)

    if (offline.length === 0) {
      return res.status(200).json({ ok: true, message: 'Todas las máquinas en línea' })
    }

    // Construir lista de máquinas desconectadas
    const lista = offline.map(m =>
      `• ${m.storeName || '—'} (${m.equipmentCode || '—'})`
    ).join('\n')

    // Enviar email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Maquinitas <onboarding@resend.dev>',
        to: [process.env.ALERT_EMAIL],
        subject: `⚠️ ${offline.length} máquina(s) desconectada(s)`,
        text: `Las siguientes máquinas están desconectadas:\n\n${lista}\n\nRevisa el dashboard: https://maquinitas.vercel.app`,
        html: `
          <h2>⚠️ Alerta de máquinas desconectadas</h2>
          <p>Las siguientes máquinas están desconectadas:</p>
          <ul>
            ${offline.map(m => `<li><strong>${m.storeName || '—'}</strong> (${m.equipmentCode || '—'})</li>`).join('')}
          </ul>
          <p><a href="https://maquinitas.vercel.app">Ver dashboard</a></p>
        `,
      })
    })

    const emailData = await emailResponse.json()

    return res.status(200).json({
      ok: true,
      offlineCount: offline.length,
      emailSent: emailResponse.ok,
      emailData,
    })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}