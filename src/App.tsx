import { useState, useEffect } from 'react'
import Login from './pages/Login'
import EmployeeDashboard from './pages/EmployeeDashboard'
import TeamLeadDashboard from './pages/TeamLeadDashboard'
import ManagerDashboard from './pages/ManagerDashboard'
import InstallPrompt from './components/InstallPrompt'
import { ThemeProvider } from './contexts/ThemeContext'

function App() {
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    console.log('App mounted')
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(parsedUser)
        console.log('User loaded from storage:', parsedUser)
      } catch (error) {
        console.error('Error parsing user from storage:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    } else {
      console.log('No stored user/token, showing login')
    }
  }, [])

  const handleLogin = (userData: any, userToken: string) => {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem('token', userToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <ThemeProvider>
      {!user || !token ? (
        <Login onLogin={handleLogin} />
      ) : !user.role || !['manager', 'team_lead', 'employee'].includes(user.role) ? (
        <div className="min-h-screen bg-beechwood-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Unknown Role</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Your account has an unrecognized role: {user.role || 'undefined'}</p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-beechwood-600 hover:bg-beechwood-700 dark:bg-beechwood-700 dark:hover:bg-beechwood-600 text-white rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      ) : (
        <>
          <InstallPrompt />
          {user.role === 'manager' && (
            <ManagerDashboard user={user} onLogout={handleLogout} />
          )}
          {user.role === 'team_lead' && (
            <TeamLeadDashboard user={user} onLogout={handleLogout} />
          )}
          {user.role === 'employee' && (
            <EmployeeDashboard user={user} onLogout={handleLogout} />
          )}
        </>
      )}
    </ThemeProvider>
  )
}

export default App
