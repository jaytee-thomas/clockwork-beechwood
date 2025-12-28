import { useState, useEffect } from 'react'
import Login from './pages/Login'
import EmployeeDashboard from './pages/EmployeeDashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'
import InstallPrompt from './components/InstallPrompt'

interface User {
  id: number
  name: string
  email: string
  role: 'employee' | 'supervisor'
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } catch (error) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData: User, token: string) => {
    setUser(userData)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-beechwood-50 flex items-center justify-center">
        <div className="text-beechwood-700">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <InstallPrompt />
      </>
    )
  }

  return (
    <>
      {user.role === 'supervisor' ? (
        <SupervisorDashboard user={user} onLogout={handleLogout} />
      ) : (
        <EmployeeDashboard user={user} onLogout={handleLogout} />
      )}
      <InstallPrompt />
    </>
  )
}

export default App

