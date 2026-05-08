export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const base = 'https://maquinitas.vercel.app'
    const { equipmentCode, equipmentId, storeId, machineNumber } = req.query

    if (!equipmentCode) return res.status(400).json({ error: 'equipmentCode requerido' })

    const now = new Date()
    const colombia = new Date(now.getTime() - 5 * 60 * 60 * 1000)
    const today = colombia.toISOString().slice(0, 10)
    const ts = Date.now()

    let allRecords = []
    let current = 1
    let hasMore = true

    while (hasMore) {
      const response = await fetch(
        `${base}/api/gw/merchant/equipmentAccount/cashIncrement/page?current=${current}&size=50&beginDate=${today}&endDate=${today}&dateText=${today}&bizStoreIdList=${storeId || ''}&equipmentCode=${equipmentCode}&equipmentId=${equipmentId || ''}&equipmentTypeId=100&machineNumber=${machineNumber || ''}&_t=${ts}`
      )
      const data = await response.json()
      const records = data?.body?.records || []
      const total = parseInt(data?.body?.total || '0')

      allRecords = [...allRecords, ...records]

      if (allRecords.length >= total || records.length === 0) {
        hasMore = false
      } else {
        current++
      }
    }

    const movements = allRecords.map(r => ({
      storeName: r.storeName || '',
      equipmentCode: r.equipmentCode || '',
      tokens: parseInt(r.outCoinsIncrement || '0'),
      amount: parseFloat(r.cashIncrement || '0'),
      created: r.created,
    }))

    return res.status(200).json({ ok: true, movements, total: movements.length })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}