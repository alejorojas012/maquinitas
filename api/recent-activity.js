export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const base = 'https://maquinitas.vercel.app'
    const today = new Date().toISOString().slice(0, 10)

    const response = await fetch(
      `${base}/api/gw/merchant/equipmentAccount/cashIncrement/page?current=1&size=20&beginDate=${today}&endDate=${today}&dateText=${today}&bizStoreIdList=&equipmentTypeName=&equipmentCode=&equipmentId=&equipmentTypeId=`
    )
    const data = await response.json()
    const records = data?.body?.records || []

    const movements = records.map(r => ({
      storeName: r.storeName || '—',
      equipmentCode: r.equipmentCode,
      tokens: parseInt(r.outCoinsIncrement || '0'),
      amount: parseFloat(r.cashIncrement || '0'),
      created: r.created,
    }))

    return res.status(200).json({ ok: true, movements })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}