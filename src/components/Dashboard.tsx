import { useState } from 'react'
import { useMachines, useStats, today } from '../hooks/useMachines'

function fmt(n: any) {
  if (n == null) return '—'
  return Number(n).toLocaleString('es-CO')
}

export default function Dashboard() {
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo] = useState(today())
  const [tab, setTab] = useState<'machines' | 'stores'>('machines')
  const [showToken, setShowToken] = useState(!localStorage.getItem('ram-token'))
  const [tokenInput, setTokenInput] = useState(localStorage.getItem('ram-token') || '')
  const { machines, loading: loadingM, error: errorM, reload } = useMachines()
  const { stats, loading: loadingS, error: errorS } = useStats(dateFrom, dateTo)

  const onlineCount = machines.filter(m => m.online).length
  const offlineCount = machines.filter(m => !m.online).length
  const totalAmount = stats.reduce((a, r) => a + (parseFloat(r.totalAmount) || 0), 0)

  function saveToken() {
    localStorage.setItem('ram-token', tokenInput)
    setShowToken(false)
    reload()
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Maquinitas</h1>
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
          <button onClick={() => setShowToken(!showToken)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, cursor: 'pointer', background: 'transparent' }}>
            🔑 Token
          </button>
        </div>
      </div>

      {showToken && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            Pega aquí el Ram-Token de gb.starthing.com (F12 → Network → cualquier petición → Headers → Ram-Token)
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={tokenInput} onChange={e => setTokenInput(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 12, fontFamily: 'monospace' }}
              placeholder="Ram-Token..." />
            <button onClick={saveToken}
              style={{ padding: '6px 16px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer' }}>
              Guardar
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Facturación total', value: '$' + fmt(Math.round(totalAmount)), sub: 'COP' },
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
      {(errorM || errorS) && (
        <p style={{ color: '#dc2626', fontSize: 13 }}>
          Error: {errorM || errorS} — 
          <button onClick={() => setShowToken(true)} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Actualizar token
          </button>
        </p>
      )}

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

      {tab === 'stores' && !loadingS && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: '#888', fontWeight: 500 }}>Tienda</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#888', fontWeight: 500 }}>Total COP</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#888', fontWeight: 500 }}>Efectivo</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#888', fontWeight: 500 }}>En línea</th>
                <th style={{ textAlign: 'right', padding: '8px', color: '#888', fontWeight: 500 }}>Monedas out</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>{r.storeName || '—'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>${fmt(Math.round(parseFloat(r.totalAmount || 0)))}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>${fmt(Math.round(parseFloat(r.totalOfflineAmount || 0)))}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>${fmt(Math.round(parseFloat(r.totalPayAmount || 0)))}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmt(r.offlineOutCoinSum || 0)}</td>
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