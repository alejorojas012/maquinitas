import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import AdminUsers from './components/AdminUsers'

function App() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [showAdmin, setShowAdmin] = useState(false)

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
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onShowAdmin={() => setShowAdmin(true)}
      showAdmin={showAdmin}
      onHideAdmin={() => setShowAdmin(false)}
      token={token}
    />
  )
}

export default App