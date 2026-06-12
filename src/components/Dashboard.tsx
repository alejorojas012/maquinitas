import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { useMachines, useStats, useBestStore, useMachineStats, useActivity, useRecentActivity, useMachineMovements, today, yesterday, firstDayOfMonth } from '../hooks/useMachines'
import axios from 'axios'

function fmt(n: any) {
  if (n == null) return '-'
  return Number(n).toLocaleString('es-CO')
}

function timeAgo(iso: string) {
  if (!iso) return '-'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`
  return `Hace ${Math.floor(diff / 86400)}d`
}

function SignalBar({ csq, dark }: { csq: number | null, dark: boolean }) {
  if (csq == null) return <span style={{ color: dark ? '#475569' : '#94a3b8', fontSize: 11 }}>Sin senal</span>
  const pct = Math.min(100, Math.round((csq / 31) * 100))
  const color = pct > 66 ? '#22c55e' : pct > 33 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
        {[25, 50, 75, 100].map((threshold, i) => (
          <div key={i} style={{ width: 4, height: 4 + i * 3, borderRadius: 2, background: pct >= threshold ? color : (dark ? '#1e293b' : '#e2e8f0') }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color }}>{pct}%</span>
    </div>
  )
}

function Toggle({ active, onChange, disabled }: { active: boolean, onChange: () => void, disabled: boolean }) {
  return (
    <div onClick={disabled ? undefined : onChange}
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <div style={{
        width: 36, height: 20, borderRadius: 99, padding: 2,
        background: active ? '#22c55e' : '#475569',
        transition: 'background 0.2s',
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transform: active ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 0.2s',
        }} />
      </div>
      <span style={{ fontSize: 11, color: active ? '#22c55e' : '#475569', fontWeight: 500 }}>
        {disabled ? '...' : active ? 'Monitoreo activo' : 'Monitoreo pausado'}
      </span>
    </div>
  )
}

interface DashboardProps {
  user: any
  onLogout: () => void
  onShowAdmin: () => void
  showAdmin: boolean
  onHideAdmin: () => void
  token: string
  dark: boolean
  onDarkChange: (dark: boolean) => void
}

export default function Dashboard({ user, onLogout, onShowAdmin, dark: darkProp, onDarkChange }: DashboardProps) {
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo] = useState(today())
  const [tab, setTab] = useState<'machines' | 'stores' | 'ranking'>('machines')
  const [rankSort, setRankSort] = useState<'name' | 'tokens'>('tokens')
  const [hideAmounts, setHideAmounts] = useState(false)
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [toggling, setToggling] = useState<string | null>(null)
  const [localActive, setLocalActive] = useState<Record<string, boolean>>({})
  const [dark, setDark] = useState(darkProp)
  const [showExport, setShowExport] = useState(false)
  const [exportFrom, setExportFrom] = useState(today())
  const [exportTo, setExportTo] = useState(today())
  const [exportStore, setExportStore] = useState('all')
  const [exporting, setExporting] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<any>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [togglingSystem, setTogglingSystem] = useState<string | null>(null)

  const { machines, loading: loadingM, reload } = useMachines()
  const { stats, reload: reloadStats } = useStats(dateFrom, dateTo)
  const { stats: statsMonth, reload: reloadStatsMonth } = useStats(firstDayOfMonth(), today())
  const { machineStats, reload: reloadMachineStats } = useMachineStats()
  const { movements } = useRecentActivity()
  const { events } = useActivity()
  const { best: bestMonth } = useBestStore(firstDayOfMonth(), today())
  const { best: bestYesterday } = useBestStore(yesterday(), yesterday())

  useEffect(() => {
    const interval = setInterval(() => {
      reload()
      reloadStats()
      reloadStatsMonth()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function toggleSystem(code: string, currentEnabled: boolean) {
    const newEnabled = !currentEnabled
    setTogglingSystem(code)
    try {
      await axios.post("/api/toggle-machine", { code, active: newEnabled, type: "system" })
      await reloadMachineStats()
    } catch (e) {
      console.error(e)
    }
    setTogglingSystem(null)
  }

  async function toggleMonitor(code: string, currentActive: boolean) {
    const newActive = !currentActive
    setToggling(code)
    setLocalActive(prev => ({ ...prev, [code]: newActive }))
    try {
      await axios.post('/api/toggle-machine', { code, active: newActive })
      await reloadMachineStats()
    } catch (e) {
      setLocalActive(prev => ({ ...prev, [code]: currentActive }))
      console.error(e)
    }
    setToggling(null)
  }

  async function downloadExcel() {
    setExporting(true)
    try {
      const params = new URLSearchParams({ dateFrom: exportFrom, dateTo: exportTo, storeId: exportStore })
      const r = await axios.get(`/api/export?${params}`)
      const data = r.data?.movements || []
      const ws = XLSX.utils.json_to_sheet(data.map((m: any) => ({
        'Fecha': m.fecha, 'Hora': m.hora, 'Tienda': m.tienda,
        'Codigo': m.codigo, 'Tokens': m.tokens,
        'Facturacion COP': m.facturacion, 'Metodo de Pago': m.metodoPago,
      })))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Movimientos')
      XLSX.writeFile(wb, `maquinitas-${exportFrom}-${exportTo}.xlsx`)
      setShowExport(false)
    } catch (e) { console.error(e) }
    setExporting(false)
  }

  const enabledMachines = machines.filter(m => (machineStats[m.equipmentCode]?.enabled ?? true))
  const onlineCount = enabledMachines.filter(m => m.online).length
  const offlineCount = enabledMachines.filter(m => !m.online).length
  const totalTokensHoy = stats.reduce((a, r) => a + (parseInt(r.offlineOutCoinSum) || 0), 0)
  const totalTokensMes = statsMonth.reduce((a, r) => a + (parseInt(r.offlineOutCoinSum) || 0), 0)
  const totalAmount = totalTokensHoy * 10000

  const filteredMachines = enabledMachines.filter(m => {
    if (filter === 'online') return m.online
    if (filter === 'offline') return !m.online
    return true
  })

  const statsByStore: any = {}
  for (const r of stats) statsByStore[r.storeName] = r
  const statsMonthByStore: any = {}
  for (const r of statsMonth) statsMonthByStore[r.storeName] = r

  const { movements: machineMovements } = useMachineMovements(selectedMachine)


  const bg = dark ? '#060d1a' : '#f1f5f9'
  const card = dark ? '#0d1929' : '#ffffff'
  const cardInner = dark ? '#0a1525' : '#f8fafc'
  const border = dark ? '#1e293b' : '#e2e8f0'
  const text = dark ? '#ffffff' : '#0f172a'
  const textMuted = dark ? '#475569' : '#64748b'
  const textSub = dark ? '#94a3b8' : '#475569'

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: 'system-ui, sans-serif', transition: 'background 0.2s' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/icon-maquinitas.png" alt="logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain' }} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: text }}>Maquinitas</h1>
              <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>GOHAN</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${border}`, background: card, color: text, fontSize: 12 }} />
            <span style={{ color: textMuted }}>-</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${border}`, background: card, color: text, fontSize: 12 }} />
            <button onClick={reload} style={{ padding: '6px 16px', borderRadius: 8, background: '#22c55e', color: '#000', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              Actualizar
            </button>
            <button onClick={() => setShowExport(true)}
              style={{ padding: '6px 16px', borderRadius: 8, background: card, color: textSub, border: `1px solid ${border}`, fontSize: 12, cursor: 'pointer' }}>
              Historial
            </button>
            {user?.isAdmin && (
              <button onClick={onShowAdmin} style={{ padding: "6px 10px", borderRadius: 8, background: card, color: textSub, border: `1px solid ${border}`, fontSize: 12, cursor: "pointer" }}>
                Usuarios
              </button>
            )}
            <button onClick={onLogout} style={{ padding: "6px 12px", borderRadius: 8, background: "transparent", color: "#ef4444", border: "1px solid #ef4444", fontSize: 12, cursor: "pointer" }}>
              Salir
            </button>
            {user?.isAdmin && (
              <button onClick={() => setShowConfig(true)} style={{ padding: "6px 10px", borderRadius: 8, background: card, color: textSub, border: `1px solid ${border}`, fontSize: 16, cursor: "pointer" }}>
                ⚙️
              </button>
            )}
            <div onClick={() => { setDark(!dark); onDarkChange(!dark) }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 36, height: 20, borderRadius: 99, padding: 2, background: dark ? '#334155' : '#cbd5e1', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: dark ? '#f8fafc' : '#0f172a', transform: dark ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Modal maquina */}
        {selectedMachine && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setSelectedMachine(null)}>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, margin: '0 16px', maxHeight: '85vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px', color: text }}>{selectedMachine.storeName}</h2>
                  <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{selectedMachine.equipmentCode} - {selectedMachine.machineNumber || 'NO.1'}</p>
                </div>
                <button onClick={() => setSelectedMachine(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, fontSize: 24, lineHeight: 1 }}>x</button>
              </div>
              {machineMovements.length > 0 && (
                <div style={{ background: cardInner, borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-around' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: textMuted, margin: '0 0 2px', textTransform: 'uppercase' }}>Total tokens</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#22c55e', margin: 0 }}>
                      {machineMovements.reduce((a: number, m: any) => a + m.tokens, 0)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: textMuted, margin: '0 0 2px', textTransform: 'uppercase' }}>Facturacion</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: text, margin: 0 }}>
                      ${fmt(machineMovements.reduce((a: number, m: any) => a + m.tokens, 0) * 10000)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: textMuted, margin: '0 0 2px', textTransform: 'uppercase' }}>Transacciones</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: text, margin: 0 }}>{machineMovements.length}</p>
                  </div>
                </div>
              )}
              <p style={{ fontSize: 11, color: textMuted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Movimientos de hoy</p>
              {machineMovements.length === 0 ? (
                <p style={{ color: textMuted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Sin movimientos hoy</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {machineMovements.map((m: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: cardInner, borderRadius: 8 }}>
                      <div>
                        <p style={{ fontSize: 12, color: text, fontWeight: 500, margin: '0 0 1px' }}>
                          {m.created ? new Date(m.created.replace(' ', 'T') + 'Z').toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </p>
                        <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>Efectivo</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', margin: '0 0 1px' }}>+{m.tokens}</p>
                        <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>${fmt(m.amount * 1000)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Panel configuracion */}
        {showConfig && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
            onClick={() => setShowConfig(false)}>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 24, width: "100%", maxWidth: 500, margin: "0 16px", maxHeight: "85vh", overflowY: "auto" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: text }}>Configuracion</h2>
                <button onClick={() => setShowConfig(false)} style={{ background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 24, lineHeight: 1 }}>x</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {machines.map((m, i) => {
                  const ms = machineStats[m.equipmentCode] || {}
                  const isActive = localActive[m.equipmentCode] !== undefined ? localActive[m.equipmentCode] : (ms.active === undefined ? true : ms.active === true)
                  const isEnabled = ms.enabled === undefined ? true : ms.enabled === true
                  return (
                    <div key={i} style={{ background: cardInner, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: text, margin: "0 0 2px" }}>{m.storeName}</p>
                          <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>{m.equipmentCode}</p>
                        </div>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600, background: m.online ? "#0d2818" : "#2a0d0d", color: m.online ? "#22c55e" : "#ef4444" }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.online ? "#22c55e" : "#ef4444", display: "inline-block" }} />
                          {m.online ? "En linea" : "Offline"}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: textMuted }}>Notificaciones</span>
                          <Toggle active={isActive} onChange={() => toggleMonitor(m.equipmentCode, isActive)} disabled={toggling === m.equipmentCode} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: textMuted }}>Sistema activo</span>
                          <Toggle active={isEnabled} onChange={() => toggleSystem(m.equipmentCode, isEnabled)} disabled={togglingSystem === m.equipmentCode} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal exportar */}
        {showExport && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, margin: '0 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: text }}>Descargar Historial</h2>
                <button onClick={() => setShowExport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, fontSize: 24, lineHeight: 1 }}>x</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: textMuted, margin: '0 0 4px' }}>Desde</p>
                  <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${border}`, background: cardInner, color: text, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: textMuted, margin: '0 0 4px' }}>Hasta</p>
                  <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${border}`, background: cardInner, color: text, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: textMuted, margin: '0 0 4px' }}>Tienda</p>
                  <select value={exportStore} onChange={e => setExportStore(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${border}`, background: cardInner, color: text, fontSize: 13 }}>
                    <option value="all">Todas las tiendas</option>
                    {stats.map((s: any) => (
                      <option key={s.storeId} value={s.storeId}>{s.storeName}</option>
                    ))}
                  </select>
                </div>
                <button onClick={downloadExcel} disabled={exporting}
                  style={{ padding: '10px', borderRadius: 8, background: '#22c55e', color: '#000', border: 'none', fontSize: 13, cursor: exporting ? 'not-allowed' : 'pointer', fontWeight: 600, marginTop: 8, opacity: exporting ? 0.7 : 1 }}>
                  {exporting ? 'Generando...' : 'Descargar Excel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Metricas top */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total Maquinas', value: enabledMachines.length },
            { label: 'En Linea', value: onlineCount, color: '#22c55e' },
            { label: 'Desconectadas', value: offlineCount, color: offlineCount > 0 ? '#ef4444' : textMuted },
            { label: 'Tokens Hoy', value: fmt(totalTokensHoy), color: '#22c55e' },
            { label: 'Tokens Mes', value: fmt(totalTokensMes) },
          ].map((s, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, color: textMuted, margin: '0 0 6px' }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: s.color || text }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Facturacion + Mejor punto */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: textMuted }}>Facturacion Hoy</span>
              <button onClick={() => setHideAmounts(!hideAmounts)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, fontSize: 14, padding: 0 }}>
                {hideAmounts ? 'Ver' : 'Ocultar'}
              </button>
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#22c55e' }}>
              {hideAmounts ? '------' : '$' + fmt(totalAmount)}
            </p>
            <p style={{ fontSize: 11, color: textMuted, margin: '2px 0 0' }}>COP</p>
          </div>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: textMuted, margin: '0 0 6px' }}>Mejor Punto - Mes</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: text, margin: '0 0 2px' }}>{bestMonth?.storeName || '-'}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#22c55e', margin: 0 }}>
              {fmt(parseInt(bestMonth?.offlineOutCoinSum || '0'))} <span style={{ fontSize: 12, fontWeight: 400, color: textMuted }}>tokens</span>
            </p>
          </div>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: textMuted, margin: '0 0 6px' }}>Mejor Punto - Ayer</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: text, margin: '0 0 2px' }}>{bestYesterday?.storeName || '-'}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#22c55e', margin: 0 }}>
              {fmt(parseInt(bestYesterday?.offlineOutCoinSum || '0'))} <span style={{ fontSize: 12, fontWeight: 400, color: textMuted }}>tokens</span>
            </p>
          </div>
        </div>

        {/* Main + Sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              {(['machines', 'stores', 'ranking'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 12, cursor: 'pointer',
                    background: tab === t ? '#22c55e' : card, color: tab === t ? '#000' : textSub, fontWeight: tab === t ? 600 : 400 }}>
                  {t === 'machines' ? `Maquinas (${enabledMachines.length})` : t === 'stores' ? 'Tiendas' : '🏆 Ranking'}
                </button>
              ))}
              {tab === 'machines' && (
                <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                  {(['all', 'online', 'offline'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${border}`, fontSize: 11, cursor: 'pointer',
                        background: filter === f ? border : 'transparent',
                        color: f === 'online' ? '#22c55e' : f === 'offline' ? '#ef4444' : textSub }}>
                      {f === 'all' ? `Todas ${enabledMachines.length}` : f === 'online' ? `En linea ${onlineCount}` : `Offline ${offlineCount}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loadingM && <p style={{ color: textMuted, fontSize: 13 }}>Cargando...</p>}

            {/* Tarjetas maquinas */}
            {tab === 'machines' && !loadingM && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {filteredMachines.map((m, i) => {
                  const ms = machineStats[m.equipmentCode] || {}
                  const isActive = localActive[m.equipmentCode] !== undefined
                    ? localActive[m.equipmentCode]
                    : (ms.active === undefined ? true : ms.active === true)
                  const tokensHoy = parseInt(statsByStore[m.storeName]?.offlineOutCoinSum || '0')
                  const tokensMes = parseInt(statsMonthByStore[m.storeName]?.offlineOutCoinSum || '0')
                  return (
                    <div key={i}
                      onClick={() => setSelectedMachine(m)}
                      role="button"
                      tabIndex={0}
                      style={{
                        background: card,
                        border: `1px solid ${!isActive ? border : m.online ? '#1a3a2a' : '#3a1a1a'}`,
                        borderRadius: 12, padding: '14px',
                        opacity: isActive ? 1 : 0.6,
                        cursor: 'pointer',
                        transition: 'transform 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: text, margin: '0 0 2px' }}>{m.storeName}</p>
                          <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>{m.equipmentCode} - {m.machineNumber || 'NO.1'}</p>
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: m.online ? '#0d2818' : '#2a0d0d', color: m.online ? '#22c55e' : '#ef4444' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.online ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
                          {m.online ? 'En linea' : 'Offline'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                        <div style={{ background: cardInner, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                          <p style={{ fontSize: 9, color: textMuted, margin: '0 0 2px', textTransform: 'uppercase' }}>Tokens Hoy</p>
                          <p style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', margin: 0 }}>{fmt(tokensHoy)}</p>
                        </div>
                        <div style={{ background: cardInner, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                          <p style={{ fontSize: 9, color: textMuted, margin: '0 0 2px', textTransform: 'uppercase' }}>Tokens Mes</p>
                          <p style={{ fontSize: 20, fontWeight: 800, color: text, margin: 0 }}>{fmt(tokensMes)}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                          <span style={{ color: textMuted }}>Senal</span>
                          <SignalBar csq={m.csq} dark={dark} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: textMuted }}>Ultima sync</span>
                          <span style={{ color: textSub }}>{timeAgo(ms.lastSeen)}</span>
                        </div>
                        {!m.online && ms.offlineSince && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                            <span style={{ color: textMuted }}>Offline desde</span>
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>{timeAgo(ms.offlineSince)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: textMuted }}>Desconexiones mes</span>
                          <span style={{ color: ms.disconnectionsThisMonth > 0 ? '#f59e0b' : textMuted, fontWeight: ms.disconnectionsThisMonth > 0 ? 600 : 400 }}>
                            {ms.disconnectionsThisMonth || 0}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: textMuted }}>Red</span>
                          <span style={{ color: textSub }}>{m.networkType || '-'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tabla tiendas */}
            {tab === 'stores' && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${border}`, background: cardInner }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: textMuted, fontWeight: 500 }}>Tienda</th>
                      <th style={{ textAlign: 'right', padding: '10px 14px', color: textMuted, fontWeight: 500 }}>Tokens</th>
                      <th style={{ textAlign: 'right', padding: '10px 14px', color: textMuted, fontWeight: 500 }}>Total COP</th>
                      <th style={{ textAlign: 'right', padding: '10px 14px', color: textMuted, fontWeight: 500 }}>Efectivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${cardInner}` }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500, color: text }}>{r.storeName || '-'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>{fmt(r.offlineOutCoinSum || 0)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: text }}>
                          {hideAmounts ? '----' : '$' + fmt(parseInt(r.offlineOutCoinSum || '0') * 10000)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: textSub }}>${fmt(Math.round(parseFloat(r.totalOfflineAmount || 0)))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {stats.length === 0 && (
                  <p style={{ color: textMuted, fontSize: 13, padding: '1rem', textAlign: 'center' }}>Sin datos para este periodo.</p>
                )}
              </div>
            )}
            {/* Tabla ranking */}
            {tab === 'ranking' && (() => {
              const ranked = [...enabledMachines].map(m => ({
                name: m.storeName,
                code: m.equipmentCode,
                online: m.online,
                tokensMes: parseInt(statsMonthByStore[m.storeName]?.offlineOutCoinSum || '0'),
              }))
              if (rankSort === 'tokens') ranked.sort((a, b) => b.tokensMes - a.tokensMes)
              else ranked.sort((a, b) => a.name.localeCompare(b.name))
              return (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${border}`, background: cardInner }}>
                    <p style={{ margin: 0, fontSize: 12, color: textMuted, fontWeight: 500 }}>Ordenar por:</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setRankSort('tokens')}
                        style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${border}`, fontSize: 11, cursor: 'pointer',
                          background: rankSort === 'tokens' ? '#22c55e' : 'transparent', color: rankSort === 'tokens' ? '#000' : textSub, fontWeight: rankSort === 'tokens' ? 600 : 400 }}>
                        Tokens mes
                      </button>
                      <button onClick={() => setRankSort('name')}
                        style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${border}`, fontSize: 11, cursor: 'pointer',
                          background: rankSort === 'name' ? '#22c55e' : 'transparent', color: rankSort === 'name' ? '#000' : textSub, fontWeight: rankSort === 'name' ? 600 : 400 }}>
                        Nombre
                      </button>
                    </div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${border}`, background: cardInner }}>
                        <th style={{ textAlign: 'center', padding: '8px 10px', color: textMuted, fontWeight: 500, width: 36 }}>#</th>
                        <th style={{ textAlign: 'left', padding: '8px 14px', color: textMuted, fontWeight: 500 }}>Maquina</th>
                        <th style={{ textAlign: 'center', padding: '8px 10px', color: textMuted, fontWeight: 500 }}>Estado</th>
                        <th style={{ textAlign: 'right', padding: '8px 14px', color: textMuted, fontWeight: 500 }}>Tokens mes</th>
                        <th style={{ textAlign: 'right', padding: '8px 14px', color: textMuted, fontWeight: 500 }}>Valor COP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map((r, i) => {
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
                        const topTokens = ranked[0]?.tokensMes || 1
                        const barPct = Math.round((r.tokensMes / topTokens) * 100)
                        return (
                          <tr key={r.code} style={{ borderBottom: `1px solid ${cardInner}` }}>
                            <td style={{ padding: '10px 10px', textAlign: 'center', fontSize: i < 3 ? 16 : 12, color: textMuted }}>{medal}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <p style={{ margin: '0 0 4px', fontWeight: 600, color: text, fontSize: 12 }}>{r.name}</p>
                              <div style={{ height: 4, borderRadius: 99, background: border, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${barPct}%`, background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#22c55e', borderRadius: 99, transition: 'width 0.4s' }} />
                              </div>
                            </td>
                            <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: r.online ? '#22c55e' : '#ef4444' }} />
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#22c55e', fontWeight: 700 }}>{fmt(r.tokensMes)}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: text }}>{hideAmounts ? '----' : '$' + fmt(r.tokensMes * 10000)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {ranked.length === 0 && (
                    <p style={{ color: textMuted, fontSize: 13, padding: '1rem', textAlign: 'center' }}>Sin datos.</p>
                  )}
                </div>
              )
            })()}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: text, margin: 0 }}>Actividad Reciente</p>
            </div>
            {movements.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Ultimos movimientos</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {movements.slice(0, 10).map((m: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: cardInner, borderRadius: 8 }}>
                      <div>
                        <p style={{ fontSize: 11, color: text, fontWeight: 600, margin: '0 0 1px' }}>{m.storeName}</p>
                        <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>
                          {m.created ? new Date(m.created.replace(' ', 'T') + 'Z').toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', margin: '0 0 1px' }}>+{m.tokens}</p>
                        <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>${fmt(m.amount * 1000)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {events.length > 0 && movements.length > 0 && (
              <div style={{ borderTop: `1px solid ${border}`, marginBottom: 12 }} />
            )}
            {events.length > 0 && (
              <div>
                <p style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Alertas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {events.slice(0, 8).map((e: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: e.event === 'online' ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
                      <div>
                        <p style={{ fontSize: 12, color: textSub, margin: '0 0 1px' }}>
                          <strong style={{ color: text }}>{e.storeName}</strong> - {e.event === 'online' ? 'reconectada' : 'desconectada'}
                        </p>
                        <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>{timeAgo(e.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {events.length === 0 && movements.length === 0 && (
              <p style={{ color: textMuted, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Sin actividad reciente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}






























