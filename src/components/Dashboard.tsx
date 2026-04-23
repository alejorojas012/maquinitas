import { useState } from 'react'
import { useMachines, useStats, useBestStore, useMachineStats, today, yesterday, firstDayOfMonth } from '../hooks/useMachines'

function fmt(n: any) {
  if (n == null) return '—'
  return Number(n).toLocaleString('es-CO')
}

function timeAgo(iso: string) {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`
  return `Hace ${Math.floor(diff / 86400)}d`
}

function SignalBars({ csq }: { csq: number | null }) {
  if (csq == null) return <span style={{ color: '#64748b', fontSize: 11 }}>Sin señal</span>
  const pct = Math.min(100, Math.round((csq / 31) * 100))
  const color = pct > 66 ? '#22c55e' : pct > 33 ? '#f59e0b' : '#ef4444'
  return (
    <span style={{ fontSize: 11, color }}>
      {pct}% · {csq} dBm
    </span>
  )
}

export default function Dashboard() {
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo] = useState(today())
  const [tab, setTab] = useState<'machines' | 'stores'>('machines')
  const [hideAmounts, setHideAmounts] = useState(false)
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all')

  const { machines, loading: loadingM, reload } = useMachines()
  const { stats } = useStats(dateFrom, dateTo)
  const { stats: statsMonth } = useStats(firstDayOfMonth(), today())
  const { machineStats } = useMachineStats()
  const { best: bestMonth } = useBestStore(firstDayOfMonth(), today())
  const { best: bestYesterday } = useBestStore(yesterday(), yesterday())

  const onlineCount = machines.filter(m => m.online).length
  const offlineCount = machines.filter(m => !m.online).length
  const totalTokens = stats.reduce((a, r) => a + (parseInt(r.offlineOutCoinSum) || 0), 0)
  const totalAmount = totalTokens * 10000

  const filteredMachines = machines.filter(m => {
    if (filter === 'online') return m.online
    if (filter === 'offline') return !m.online
    return true
  })

  // Mapa de stats por storeName
  const statsByStore: any = {}
  for (const r of stats) statsByStore[r.storeName] = r
  const statsMonthByStore: any = {}
  for (const r of statsMonth) statsMonthByStore[r.storeName] = r

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif', background: '#0a0f1e', minHeight: '100vh', color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#fff' }}>Maquinitas</h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>gb.starthing.com</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #1e293b', background: '#1e293b', color: '#fff', fontSize: 13 }} />
          <span style={{ color: '#64748b', fontSize: 12 }}>—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #1e293b', background: '#1e293b', color: '#fff', fontSize: 13 }} />
          <button onClick={reload}
            style={{ padding: '6px 16px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer' }}>
            Actualizar
          </button>
        </div>
      </div>

      {/* Tarjetas mejor punto */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>🏆 Mejor Punto — Mes actual</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{bestMonth?.storeName || '—'}</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: '#22c55e', margin: '4px 0 2px' }}>{fmt(parseInt(bestMonth?.offlineOutCoinSum || '0'))}</p>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>fichas este mes</p>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>📈 Mejor Punto — Día anterior</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{bestYesterday?.storeName || '—'}</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: '#22c55e', margin: '4px 0 2px' }}>{fmt(parseInt(bestYesterday?.offlineOutCoinSum || '0'))}</p>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>fichas ayer</p>
        </div>
      </div>

      {/* Métricas globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px' }}>Facturación total</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 22, fontWeight: 600, margin: 0, color: '#fff' }}>
              {hideAmounts ? '••••••' : '$' + fmt(totalAmount)}
            </p>
            <button onClick={() => setHideAmounts(!hideAmounts)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16, padding: 0 }}>
              {hideAmounts ? '👁️' : '🙈'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>COP</p>
        </div>
        {[
          { label: 'Tokens entregados', value: fmt(totalTokens), sub: 'fichas hoy' },
          { label: 'Tiendas', value: stats.length },
          { label: 'En línea', value: onlineCount, color: '#22c55e' },
          { label: 'Desconectadas', value: offlineCount, color: offlineCount > 0 ? '#ef4444' : '#64748b' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 600, margin: 0, color: s.color || '#fff' }}>{s.value}</p>
            {s.sub && <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs y filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['machines', 'stores'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #1e293b', fontSize: 13, cursor: 'pointer',
              background: tab === t ? '#2563eb' : '#0f172a', color: tab === t ? '#fff' : '#94a3b8' }}>
            {t === 'machines' ? `Máquinas (${machines.length})` : 'Tiendas'}
          </button>
        ))}
        {tab === 'machines' && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {(['all', 'online', 'offline'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid #1e293b', fontSize: 12, cursor: 'pointer',
                  background: filter === f ? '#1e293b' : 'transparent',
                  color: f === 'online' ? '#22c55e' : f === 'offline' ? '#ef4444' : '#94a3b8' }}>
                {f === 'all' ? 'Todas' : f === 'online' ? 'En línea' : 'Desconectadas'}
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingM && <p style={{ color: '#64748b', fontSize: 13 }}>Cargando...</p>}

      {/* Tarjetas de máquinas */}
      {tab === 'machines' && !loadingM && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filteredMachines.map((m, i) => {
            const ms = machineStats[m.equipmentCode] || {}
            const storeStats = statsByStore[m.storeName] || {}
            const storeStatsMonth = statsMonthByStore[m.storeName] || {}
            const tokensHoy = parseInt(storeStats.offlineOutCoinSum || '0')
            const tokensMes = parseInt(storeStatsMonth.offlineOutCoinSum || '0')

            return (
              <div key={i} style={{
                background: '#0f172a',
                border: `1px solid ${m.online ? '#1e3a2f' : '#3a1e1e'}`,
                borderRadius: 12,
                padding: '16px',
                position: 'relative',
              }}>
                {/* Header tarjeta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{m.storeName}</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{m.equipmentCode} · {m.machineNumber || 'NO.1'}</p>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: m.online ? '#0d2818' : '#2a0f0f',
                    color: m.online ? '#22c55e' : '#ef4444'
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.online ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
                    {m.online ? 'En línea' : 'Desconectada'}
                  </span>
                </div>

                {/* Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: '#1e293b', borderRadius: 8, padding: '8px 10px' }}>
                    <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px' }}>FICHAS HOY</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#22c55e', margin: 0 }}>{fmt(tokensHoy)}</p>
                  </div>
                  <div style={{ background: '#1e293b', borderRadius: 8, padding: '8px 10px' }}>
                    <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px' }}>FICHAS MES</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{fmt(tokensMes)}</p>
                  </div>
                </div>

                {/* Detalles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>⚡ Señal</span>
                    <SignalBars csq={m.csq} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>🕐 Última sync</span>
                    <span style={{ color: '#94a3b8' }}>{timeAgo(ms.lastSeen)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>⚠️ Desconexiones mes</span>
                    <span style={{ color: ms.disconnectionsThisMonth > 0 ? '#f59e0b' : '#94a3b8' }}>
                      {ms.disconnectionsThisMonth || 0}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>📶 Red</span>
                    <span style={{ color: '#94a3b8' }}>{m.networkType || '—'}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabla tiendas */}
      {tab === 'stores' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: '#64748b', fontWeight: 500 }}>Tienda</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#64748b', fontWeight: 500 }}>Total COP</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#64748b', fontWeight: 500 }}>Fichas</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#64748b', fontWeight: 500 }}>Efectivo</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#64748b', fontWeight: 500 }}>En línea</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 500, color: '#fff' }}>{r.storeName || '—'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#fff' }}>
                    {hideAmounts ? '••••••' : '$' + fmt(parseInt(r.offlineOutCoinSum || '0') * 10000)}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#22c55e' }}>{fmt(r.offlineOutCoinSum || 0)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#94a3b8' }}>${fmt(Math.round(parseFloat(r.totalOfflineAmount || 0)))}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#94a3b8' }}>${fmt(Math.round(parseFloat(r.totalPayAmount || 0)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.length === 0 && (
            <p style={{ color: '#64748b', fontSize: 13, padding: '1rem 0' }}>Sin datos para este período.</p>
          )}
        </div>
      )}
    </div>
  )
}