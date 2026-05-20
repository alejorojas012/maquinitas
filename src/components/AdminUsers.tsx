import { useState, useEffect } from 'react'
import axios from 'axios'

interface Props {
  token: string
  dark: boolean
}

export default function AdminUsers({ token, dark }: Props) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)

  const card = dark ? '#0d1929' : '#ffffff'
  const border = dark ? '#1e293b' : '#e2e8f0'
  const text = dark ? '#ffffff' : '#0f172a'
  const textMuted = dark ? '#475569' : '#64748b'
  const cardInner = dark ? '#0a1525' : '#f8fafc'

  async function loadUsers() {
    setLoading(true)
    try {
      const r = await axios.get('/api/auth-users', {
        headers: { 'x-auth-token': token }
      })
      setUsers(r.data.users || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function handleAction(email: string, action: 'approved' | 'rejected' | 'deleted') {
    setProcessing(email)
    try {
      await axios.post('/api/auth-users', { email, action }, {
        headers: { 'x-auth-token': token }
      })
      await loadUsers()
    } catch (e) {
      console.error(e)
    }
    setProcessing(null)
  }

  useEffect(() => { loadUsers() }, [])

  const statusColor = (status: string) => {
    if (status === 'approved') return '#22c55e'
    if (status === 'rejected') return '#ef4444'
    return '#f59e0b'
  }

  const statusLabel = (status: string) => {
    if (status === 'approved') return 'Aprobado'
    if (status === 'rejected') return 'Rechazado'
    return 'Pendiente'
  }

  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: text }}>Panel de Usuarios</h2>
        <button onClick={loadUsers} style={{ padding: '6px 12px', borderRadius: 8, background: '#22c55e', color: '#000', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
          Actualizar
        </button>
      </div>

      {loading ? (
        <p style={{ color: textMuted, fontSize: 13 }}>Cargando...</p>
      ) : users.length === 0 ? (
        <p style={{ color: textMuted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No hay usuarios registrados</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map((u, i) => (
            <div key={i} style={{ background: cardInner, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: text, margin: '0 0 2px' }}>{u.name}</p>
                  <p style={{ fontSize: 12, color: textMuted, margin: '0 0 2px' }}>{u.email}</p>
                  <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>
                    {new Date(u.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(u.status), background: `${statusColor(u.status)}22`, padding: '3px 10px', borderRadius: 99 }}>
                  {statusLabel(u.status)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {u.status !== 'approved' && (
                  <button onClick={() => handleAction(u.email, 'approved')} disabled={processing === u.email}
                    style={{ flex: 1, padding: '6px', borderRadius: 8, background: '#22c55e', color: '#000', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: processing === u.email ? 0.7 : 1 }}>
                    Aprobar
                  </button>
                )}
                {u.status !== 'rejected' && (
                  <button onClick={() => handleAction(u.email, 'rejected')} disabled={processing === u.email}
                    style={{ flex: 1, padding: '6px', borderRadius: 8, background: '#2a0d0d', color: '#ef4444', border: '1px solid #ef4444', fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: processing === u.email ? 0.7 : 1 }}>
                    Rechazar
                  </button>
                )}
                <button onClick={() => handleAction(u.email, 'deleted')} disabled={processing === u.email}
                  style={{ padding: '6px 12px', borderRadius: 8, background: 'transparent', color: textMuted, border: `1px solid ${border}`, fontSize: 12, cursor: 'pointer', opacity: processing === u.email ? 0.7 : 1 }}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}