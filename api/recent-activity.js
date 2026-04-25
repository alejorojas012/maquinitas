export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const base = 'https://maquinitas.vercel.app'
    const today = new Date().toISOString().slice(0, 10)
    const ts = Date.now()

    const response = await fetch(
      `${base}/api/gw/merchant/equipmentAccount/cashIncrement/page?current=1&size=20&beginDate=${today}&endDate=${today}&dateText=${today}&bizStoreIdList=&equipmentTypeName=&equipmentCode=&equipmentId=&equipmentTypeId=&_t=${ts}`
    )
    const data = await response.json()
    const records = data?.body?.records || []

    const movements = records
      .map(r => ({
        storeName: r.storeName || '—',
        equipmentCode: r.equipmentCode,
        tokens: parseInt(r.outCoinsIncrement || '0'),
        amount: parseFloat(r.cashIncrement || '0'),
        created: r.created,
      }))
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())

    return res.status(200).json({ ok: true, movements })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}