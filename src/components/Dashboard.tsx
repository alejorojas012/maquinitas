import { useState, useEffect } from 'react'
import { useMachines, useStats, useBestStore, useMachineStats, useActivity, today, yesterday, firstDayOfMonth } from '../hooks/useMachines'
import axios from 'axios'

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

function SignalBar({ csq }: { csq: number | null }) {
  if (csq == null) return <span style={{ color: '#475569', fontSize: 11 }}>Sin señal</span>
  const pct = Math.min(100, Math.round((csq / 31) * 100))
  const color = pct > 66 ? '#22c55e' : pct > 33 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
        {[25, 50, 75, 100].map((threshold, i) => (
          <div key={i} style={{ width: 4, height: 4 + i * 3, borderRadius: 2, background: pct >= threshold ? color : '#1e293b' }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color }}>{pct}%</span>
    </div>
  )
}

export default function Dashboard() {
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo] = useState(today())
  const [tab, setTab] = useState<'machines' | 'stores'>('machines')
  const [hideAmounts, setHideAmounts] = useState(false)
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [toggling, setToggling] = useState<string | null>(null)

  const { machines, loading: loadingM, reload } = useMachines()
  const { stats } = useStats(dateFrom, dateTo)
  const { stats: statsMonth } = useStats(firstDayOfMonth(), today())
  const { machineStats, reload: reloadStats } = useMachineStats()
  const { events } = useActivity()
  const { best: bestMonth } = useBestStore(firstDayOfMonth(), today())
  const { best: bestYesterday } = useBestStore(yesterday(), yesterday())

  useEffect(() => {
    const interval = setInterval(() => { reload() }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function toggleMonitor(code: string, currentActive: boolean) {
    setToggling(code)
    try {
      await axios.post('/api/toggle-machine', { code, active: !currentActive })
      await reloadStats()
    } catch (e) {
      console.error(e)
    }
    setToggling(null)
  }

  const onlineCount = machines.filter(m => m.online).length
  const offlineCount = machines.filter(m => !m.online).length
  const totalTokensHoy = stats.reduce((a, r) => a + (parseInt(r.offlineOutCoinSum) || 0), 0)
  const totalTokensMes = statsMonth.reduce((a, r) => a + (parseInt(r.offlineOutCoinSum) || 0), 0)
  const totalAmount = totalTokensHoy * 10000

  const filteredMachines = machines.filter(m => {
    if (filter === 'online') return m.online
    if (filter === 'offline') return !m.online
    return true
  })

  const statsByStore: any = {}
  for (const r of stats) statsByStore[r.storeName] = r
  const statsMonthByStore: any = {}
  for (const r of statsMonth) statsMonthByStore[r.storeName] = r

  return (
    <div style={{ background: '#060d1a', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/icon-maquinitas.png" alt="logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain' }} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Maquinitas</h1>
              <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>gb.starthing.com</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #1e293b', background: '#0f172a', color: '#fff', fontSize: 12 }} />
            <span style={{ color: '#475569' }}>—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #1e293b', background: '#0f172a', color: '#fff', fontSize: 12 }} />
            <button onClick={reload} style={{ padding: '6px 16px', borderRadius: 8, background: '#22c55e', color: '#000', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              ↻ Actualizar
            </button>
          </div>
        </div>

        {/* Métricas top */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total Máquinas', value: machines.length, icon: '🖥️' },
            { label: 'En Línea', value: onlineCount, icon: '🟢', color: '#22c55e' },
            { label: 'Desconectadas', value: offlineCount, icon: '🔴', color: offlineCount > 0 ? '#ef4444' : '#475569' },
            { label: 'Fichas Hoy', value: fmt(totalTokensHoy), icon: '🪙', color: '#22c55e' },
            { label: 'Fichas Mes', value: fmt(totalTokensMes), icon: '📅' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#0d1929', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#475569' }}>{s.label}</span>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: s.color || '#fff' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Facturación + Mejor punto */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#0d1929', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#475569' }}>💰 Facturación Hoy</span>
              <button onClick={() => setHideAmounts(!hideAmounts)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 14, padding: 0 }}>
                {hideAmounts ? '👁️' : '🙈'}
              </button>
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#22c55e' }}>
              {hideAmounts ? '••••••' : '$' + fmt(totalAmount)}
            </p>
            <p style={{ fontSize: 11, color: '#475569', margin: '2px 0 0' }}>COP</p>
          </div>
          <div style={{ background: '#0d1929', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: '#475569', margin: '0 0 6px' }}>🏆 Mejor Punto — Mes</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{bestMonth?.storeName || '—'}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#22c55e', margin: 0 }}>
              {fmt(parseInt(bestMonth?.offlineOutCoinSum || '0'))} <span style={{ fontSize: 12, fontWeight: 400, color: '#475569' }}>fichas</span>
            </p>
          </div>
          <div style={{ background: '#0d1929', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: '#475569', margin: '0 0 6px' }}>📈 Mejor Punto — Ayer</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{bestYesterday?.storeName || '—'}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#22c55e', margin: 0 }}>
              {fmt(parseInt(bestYesterday?.offlineOutCoinSum || '0'))} <span style={{ fontSize: 12, fontWeight: 400, color: '#475569' }}>fichas</span>
            </p>
          </div>
        </div>

        {/* Main + Sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              {(['machines', 'stores'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #1e293b', fontSize: 12, cursor: 'pointer',
                    background: tab === t ? '#22c55e' : '#0d1929', color: tab === t ? '#000' : '#94a3b8', fontWeight: tab === t ? 600 : 400 }}>
                  {t === 'machines' ? `Máquinas (${machines.length})` : 'Tiendas'}
                </button>
              ))}
              {tab === 'machines' && (
                <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                  {(['all', 'online', 'offline'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #1e293b', fontSize: 11, cursor: 'pointer',
                        background: filter === f ? '#1e293b' : 'transparent',
                        color: f === 'online' ? '#22c55e' : f === 'offline' ? '#ef4444' : '#94a3b8' }}>
                      {f === 'all' ? `Todas ${machines.length}` : f === 'online' ? `En línea ${onlineCount}` : `Offline ${offlineCount}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loadingM && <p style={{ color: '#475569', fontSize: 13 }}>Cargando...</p>}

            {/* Tarjetas máquinas */}
            {tab === 'machines' && !loadingM && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {filteredMachines.map((m, i) => {
                  const ms = machineStats[m.equipmentCode] || {}
                  const isActive = ms.active !== false
                  const tokensHoy = parseInt(statsByStore[m.storeName]?.offlineOutCoinSum || '0')
                  const tokensMes = parseInt(statsMonthByStore[m.storeName]?.offlineOutCoinSum || '0')
                  return (
                    <div key={i} style={{
                      background: '#0d1929',
                      border: `1px solid ${!isActive ? '#1e293b' : m.online ? '#1a3a2a' : '#3a1a1a'}`,
                      borderRadius: 12, padding: '14px',
                      opacity: isActive ? 1 : 0.6,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{m.storeName}</p>
                          <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>{m.equipmentCode} · {m.machineNumber || 'NO.1'}</p>
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: m.online ? '#0d2818' : '#2a0d0d', color: m.online ? '#22c55e' : '#ef4444' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.online ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
                          {m.online ? 'En línea' : 'Offline'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                        <div style={{ background: '#0a1525', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', textTransform: 'uppercase' }}>Fichas Hoy</p>
                          <p style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', margin: 0 }}>{fmt(tokensHoy)}</p>
                        </div>
                        <div style={{ background: '#0a1525', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                          <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', textTransform: 'uppercase' }}>Fichas Mes</p>
                          <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>{fmt(tokensMes)}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                          <span style={{ color: '#475569' }}>Señal</span>
                          <SignalBar csq={m.csq} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: '#475569' }}>Última sync</span>
                          <span style={{ color: '#94a3b8' }}>{timeAgo(ms.lastSeen)}</span>
                        </div>
                        {!m.online && ms.offlineSince && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                            <span style={{ color: '#475569' }}>Offline desde</span>
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>{timeAgo(ms.offlineSince)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: '#475569' }}>Desconexiones mes</span>
                          <span style={{ color: ms.disconnectionsThisMonth > 0 ? '#f59e0b' : '#475569', fontWeight: ms.disconnectionsThisMonth > 0 ? 600 : 400 }}>
                            {ms.disconnectionsThisMonth || 0}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: '#475569' }}>Red</span>
                          <span style={{ color: '#94a3b8' }}>{m.networkType || '—'}</span>
                        </div>
                        {/* Toggle monitoreo */}
                        <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8, marginTop: 4 }}>
                          <button
                            onClick={() => toggleMonitor(m.equipmentCode, isActive)}
                            disabled={toggling === m.equipmentCode}
                            style={{
                              width: '100%', padding: '6px', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                              border: `1px solid ${isActive ? '#22c55e33' : '#1e293b'}`,
                              background: isActive ? '#0d2818' : '#1e293b',
                              color: isActive ? '#22c55e' : '#475569',
                            }}>
                            {toggling === m.equipmentCode ? '...' : isActive ? '🔔 Monitoreo activo' : '🔕 Monitoreo pausado'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tabla tiendas */}
            {tab === 'stores' && (
              <div style={{ background: '#0d1929', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e293b', background: '#0a1525' }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: '#475569', fontWeight: 500 }}>Tienda</th>
                      <th style={{ textAlign: 'right', padding: '10px 14px', color: '#475569', fontWeight: 500 }}>Fichas</th>
                      <th style={{ textAlign: 'right', padding: '10px 14px', color: '#475569', fontWeight: 500 }}>Total COP</th>
                      <th style={{ textAlign: 'right', padding: '10px 14px', color: '#475569', fontWeight: 500 }}>Efectivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #0a1525' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500, color: '#fff' }}>{r.storeName || '—'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>{fmt(r.offlineOutCoinSum || 0)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#fff' }}>
                          {hideAmounts ? '••••' : '$' + fmt(parseInt(r.offlineOutCoinSum || '0') * 10000)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#94a3b8' }}>${fmt(Math.round(parseFloat(r.totalOfflineAmount || 0)))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {stats.length === 0 && (
                  <p style={{ color: '#475569', fontSize: 13, padding: '1rem', textAlign: 'center' }}>Sin datos para este período.</p>
                )}
              </div>
            )}
          </div>

          {/* Actividad reciente */}
          <div style={{ background: '#0d1929', border: '1px solid #1e293b', borderRadius: 12, padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>Actividad Reciente</p>
            </div>
            {events.length === 0 ? (
              <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Sin actividad reciente</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {events.slice(0, 15).map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: e.event === 'online' ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
                    <div>
                      <p style={{ fontSize: 12, color: '#cbd5e1', margin: '0 0 1px' }}>
                        <strong>{e.storeName}</strong> — {e.event === 'online' ? 'reconectada' : 'desconectada'}
                      </p>
                      <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>{timeAgo(e.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}