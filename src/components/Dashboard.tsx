import { useState } from 'react'
import { useMachines, useStats, useBestStore, today, yesterday, firstDayOfMonth } from '../hooks/useMachines'

function fmt(n: any) {
  if (n == null) return '—'
  return Number(n).toLocaleString('es-CO')
}

export default function Dashboard() {
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo] = useState(today())
  const [tab, setTab] = useState<'machines' | 'stores'>('machines')

  const { machines, loading: loadingM, error: errorM, reload } = useMachines()
  const { stats, loading: loadingS } = useStats(dateFrom, dateTo)
  const { best: bestMonth } = useBestStore(firstDayOfMonth(), today())
  const { best: bestYesterday } = useBestStore(yesterday(), yesterday())

  const onlineCount = machines.filter(m => m.online).length
  const offlineCount = machines.filter(m => !m.online).length
  const totalTokens = stats.reduce((a, r) => a + (parseInt(r.offlineOutCoinSum) || 0), 0)
  const totalAmount = stats.reduce((a, r) => a + (parseFloat(r.totalAmount) || 0), 0)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Maquinitas {/* v2 */}</h1>
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>gb.starthing.com</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }} />
          <span style={{ color: '#888', fontSize: 12 }}>—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }} />
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
          <p style={{ fontSize: 28, fontWeight: 800, color: '#22c55e', margin: '4px 0 2px' }}>
            {fmt(parseInt(bestMonth?.offlineOutCoinSum || '0'))}
          </p>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>fichas este mes</p>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>📈 Mejor Punto — Día anterior</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{bestYesterday?.storeName || '—'}</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: '#22c55e', margin: '4px 0 2px' }}>
            {fmt(parseInt(bestYesterday?.offlineOutCoinSum || '0'))}
          </p>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>fichas ayer</p>
        </div>
      </div>

      {/* Tarjetas métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Facturación total', value: '$' + fmt(Math.round(totalAmount)), sub: 'COP' },
          { label: 'Tokens entregados', value: fmt(totalTokens), sub: 'fichas' },
          { label: 'Tiendas', value: stats.length },
          { label: 'En línea', value: onlineCount, color: '#16a34a' },
          { label: 'Desconectadas', value: offlineCount, color: '#888' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: s.color || '#111' }}>{s.value}</p>
            {s.sub && <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['machines', 'stores'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, cursor: 'pointer',
              background: tab === t ? '#2563eb' : 'transparent', color: tab === t ? '#fff' : '#444' }}>
            {t === 'machines' ? `Máquinas (${machines.length})` : 'Tiendas'}
          </button>
        ))}
      </div>

      {(loadingM || loadingS) && <p style={{ color: '#888', fontSize: 13 }}>Cargando...</p>}
      {errorM && <p style={{ color: '#dc2626', fontSize: 13 }}>Error: {errorM}</p>}

      {/* Tabla máquinas */}
      {tab === 'machines' && !loadingM && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: '#888', fontWeight: 500 }}>Código</th>
                <th style={{ textAlign: 'left', padding: '8px', color: '#888', fontWeight: 500 }}>Tienda</th>
                <th style={{ textAlign: 'left', padding: '8px', color: '#888', fontWeight: 500 }}>Estado</th>
                <th style={{ textAlign: 'left', padding: '8px', color: '#888', fontWeight: 500 }}>Tipo</th>
                <th style={{ textAlign: 'left', padding: '8px', color: '#888', fontWeight: 500 }}>Señal</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: 12 }}>{m.equipmentCode || '—'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ fontWeight: 500 }}>{m.storeName || '—'}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{m.machineNumber || ''}</div>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                      borderRadius: 99, fontSize: 12, fontWeight: 500,
                      background: m.online ? '#dcfce7' : '#f1f5f9',
                      color: m.online ? '#16a34a' : '#888' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%',
                        background: m.online ? '#22c55e' : '#94a3b8', display: 'inline-block' }} />
                      {m.online ? 'En línea' : 'Desconectada'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', color: '#888', fontSize: 12 }}>{m.equipmentTypeName || '—'}</td>
                  <td style={{ padding: '10px 8px', color: '#888', fontSize: 12 }}>
                    {m.csq != null ? `${m.csq} dBm` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {machines.length === 0 && !loadingM && (
            <p style={{ color: '#888', fontSize: 13, padding: '1rem 0' }}>Sin máquinas.</p>
          )}
        </div>
      )}

      {/* Tabla tiendas */}
      {tab === 'stores' && !loadingS && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: '#888', fontWeight: 500 }}>Tienda</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#888', fontWeight: 500 }}>Total COP</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#888', fontWeight: 500 }}>Fichas</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#888', fontWeight: 500 }}>Efectivo</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#888', fontWeight: 500 }}>En línea</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>{r.storeName || '—'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>${fmt(Math.round(parseFloat(r.totalAmount || 0)))}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmt(r.offlineOutCoinSum || 0)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>${fmt(Math.round(parseFloat(r.totalOfflineAmount || 0)))}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>${fmt(Math.round(parseFloat(r.totalPayAmount || 0)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.length === 0 && !loadingS && (
            <p style={{ color: '#888', fontSize: 13, padding: '1rem 0' }}>Sin datos para este período.</p>
          )}
        </div>
      )}
    </div>
  )
}