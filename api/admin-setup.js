export default async function handler(req, res) {
  const kvUrl = process.env.KV_REST_API_URL
  const kvToken = process.env.KV_REST_API_TOKEN

  try {
    const userRes = await fetch(`${kvUrl}/get/user:alejo.rojas012@gmail.com`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    })
    const userData = await userRes.json()
    
    if (!userData.result) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const user = typeof userData.result === 'string' ? JSON.parse(userData.result) : userData.result
    user.status = 'approved'

    await fetch(`${kvUrl}/set/user:alejo.rojas012@gmail.com/${encodeURIComponent(JSON.stringify(user))}`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    })

    return res.status(200).json({ ok: true, message: 'Usuario aprobado', user })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}