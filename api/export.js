export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const base = 'https://maquinitas.vercel.app'
    const { dateFrom, dateTo, storeId } = req.query

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom y dateTo son requeridos' })
    }

    const bizStoreIdList = storeId && storeId !== 'all' ? storeId : ''
    const ts = Date.now()

    let allRecords = []
    let current = 1
    let hasMore = true

    while (hasMore) {
      const response = await fetch(
        `${base}/api/gw/merchant/equipmentAccount/cashIncrement/page?current=${current}&size=50&beginDate=${dateFrom}&endDate=${dateTo}&dateText=${dateFrom}&bizStoreIdList=${bizStoreIdList}&equipmentTypeName=&equipmentCode=&equipmentId=&equipmentTypeId=&_t=${ts}`
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
      fecha: r.created?.slice(0, 10) || '',
      hora: r.created ? new Date(r.created.replace(' ', 'T') + 'Z').toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }) : '',
      tienda: r.storeName || '',
      codigo: r.equipmentCode || '',
      tokens: parseInt(r.outCoinsIncrement || '0'),
      facturacion: parseInt(r.outCoinsIncrement || '0') * 10000,
      metodoPago: r.payMethod === 2 ? 'Efectivo' : 'En línea',
    }))

    return res.status(200).json({ ok: true, movements, total: movements.length })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}