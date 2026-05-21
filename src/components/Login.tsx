import { useState } from 'react'
import axios from 'axios'

interface Props {
  onLogin: (token: string, user: any) => void
}

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const card = '#0d1929'
  const border = '#1e293b'
  const text = '#ffffff'
  const textMuted = '#475569'
  const cardInner = '#0a1525'

  async function handleSubmit() {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const r = await axios.post('/api/auth-login', { email, password })
        localStorage.setItem('maq-token', r.data.token)
        localStorage.setItem('maq-user', JSON.stringify(r.data.user))
        onLogin(r.data.token, r.data.user)
      } else {
        const r = await axios.post('/api/auth-register', { name, email, password })
        setSuccess(r.data.message)
        setMode('login')
        setName('')
        setEmail('')
        setPassword('')
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al procesar la solicitud')
    }
    setLoading(false)
  }

  return (
    <div style={{ background: '#060d1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400, margin: '0 16px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/icon-maquinitas.png" alt="logo" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'contain', marginBottom: 12 }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: text }}>Maquinitas</h1>
          <p style={{ fontSize: 13, color: textMuted, margin: '4px 0 0' }}>gb.starthing.com</p>
        </div>

        {/* Card */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 24 }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 13, cursor: 'pointer', fontWeight: m === mode ? 600 : 400, background: m === mode ? '#22c55e' : 'transparent', color: m === mode ? '#000' : textMuted }}>
                {m === 'login' ? 'Iniciar sesion' : 'Registrarse'}
              </button>
            ))}
          </div>

          {/* Formulario */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'register' && (
              <div>
                <p style={{ fontSize: 11, color: textMuted, margin: '0 0 4px' }}>Nombre</p>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${border}`, background: cardInner, color: text, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            )}
            <div>
              <p style={{ fontSize: 11, color: textMuted, margin: '0 0 4px' }}>Email</p>
              <input value={email} onChange={e => setEmail(e.target.value)}
                type="email" placeholder="tu@email.com"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${border}`, background: cardInner, color: text, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: textMuted, margin: '0 0 4px' }}>Contrasena</p>
              <input value={password} onChange={e => setPassword(e.target.value)}
                type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${border}`, background: cardInner, color: text, fontSize: 13, boxSizing: 'border-box' }} />
            </div>

            {error && (
              <div style={{ background: '#2a0d0d', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>
              </div>
            )}

            {success && (
              <div style={{ background: '#0d2818', border: '1px solid #22c55e', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 12, color: '#22c55e', margin: 0 }}>{success}</p>
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              style={{ padding: '12px', borderRadius: 8, background: '#22c55e', color: '#000', border: 'none', fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: loading ? 0.7 : 1, marginTop: 4 }}>
              {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Solicitar acceso'}
            </button>
          </div>
        </div>

        {mode === 'register' && (
          <p style={{ fontSize: 11, color: textMuted, textAlign: 'center', marginTop: 16 }}>
            Al registrarte, el administrador recibira una notificacion y debera aprobar tu acceso.
          </p>
        )}
      </div>
    </div>
  )
}
