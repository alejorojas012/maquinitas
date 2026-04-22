export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const response = await fetch('https://gb.starthing.com/gw/merchant/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Accept-Language': 'es',
        'Ram-System': '114426987931596800',
      },
      body: JSON.stringify({
        account: '3046504500',
        password: 'f8869f779d3a4d096324d1a4f60d4b30',
        _notSave_password: '119119ch',
        clientType: 'h5',
        companyCode: 'STAR_THING',
        productCode: 'EQUIPMENT_MANAGEMENT_H5',
        serviceCode: 'MCH_LOGIN',
        userTypeCode: 'MERCHANT',
        verifyCode: 47712,
      })
    })

    const data = await response.json()

    if (data?.body?.token) {
      return res.status(200).json({
        token: data.body.token,
        tenantId: data.body.tenantId,
      })
    } else {
      return res.status(401).json({ error: 'Login fallido', detail: data })
    }
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}