import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import AdminUsers from './components/AdminUsers'

function App() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('maq-token')
    const savedUser = localStorage.getItem('maq-user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
  }, [])

  function handleLogin(newToken: string, newUser: any) {
    setToken(newToken)
    setUser(newUser)
  }

  function handleLogout() {
    localStorage.removeItem('maq-token')
    localStorage.removeItem('maq-user')
    setToken(null)
    setUser(null)
    setShowAdmin(false)
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <>
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onShowAdmin={() => setShowAdmin(true)}
        showAdmin={showAdmin}
        onHideAdmin={() => setShowAdmin(false)}
        token={token}
        dark={dark}
        onDarkChange={setDark}
      />
      {showAdmin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setShowAdmin(false)}>
          <div style={{ width: '100%', maxWidth: 500, margin: '0 16px' }} onClick={e => e.stopPropagation()}>
            <AdminUsers token={token} dark={dark} />
            <button onClick={() => setShowAdmin(false)}
              style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 8, background: 'transparent', color: '#475569', border: '1px solid #1e293b', fontSize: 13, cursor: 'pointer' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default App