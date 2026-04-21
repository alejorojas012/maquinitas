export default async function handler(req, res) {
  const path = req.url.replace('/api', '')
  const url = `https://gb.starthing.com/gw/merchant${path}`
  
  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Ram-System': '1144269879315968000',
        'Ram-Tenant': '1405022612241514496',
        'Ram-Token': 'df9a6092108647649aed55ce0e51f55b1495927437289426944',
        'X-Accept-Language': 'es',
        'Content-Type': 'application/json',
      },
    })
    const data = await response.json()
    res.status(200).json(data)
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}