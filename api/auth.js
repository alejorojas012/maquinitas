export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const response = await fetch('https://gb.starthing.com/gw/merchant/common/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Accept-Language': 'es',
        'Ram-System': process.env.RAM_SYSTEM,
        'Ram-Tenant': process.env.RAM_TENANT,
        'Referer': 'https://gb.starthing.com/',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
      },
      body: JSON.stringify({
        account: process.env.ST_ACCOUNT,
        password: process.env.ST_PASSWORD,
        _notSave_password: process.env.ST_PASSWORD_PLAIN,
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
     return res.status(401).json({ error: 'Login fallido', detail: data, sentBody: {
  account: process.env.ST_ACCOUNT,
  password: process.env.ST_PASSWORD,
  plain: process.env.ST_PASSWORD_PLAIN,
}})
    }
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}