import { useState } from 'react'
import { Clock, Users, Shield, UserCircle } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

interface LoginProps {
  onLogin: (user: any, token: string) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'employee'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed')
      }

      onLogin(data.user, data.token)
    } catch (err: any) {
      setError(err.message || 'Network error - is the server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-beechwood-100 to-beechwood-200 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-300">
      {/* Theme Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Clock className="w-12 h-12 text-beechwood-700 dark:text-beechwood-400" />
          </div>
          <h1 className="text-4xl font-bold text-beechwood-900 dark:text-white mb-2">ClockWork</h1>
          <p className="text-beechwood-600 dark:text-beechwood-300">by Beechwood</p>
          <p className="text-sm text-beechwood-500 dark:text-beechwood-400 mt-1">
            Workforce scheduling that runs like clockwork
          </p>
        </div>

        {/* Login/Register Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-beechwood-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-beechwood-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-beechwood-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Account Type
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    className={`p-4 border-2 rounded-lg flex items-center gap-3 transition ${
                      formData.role === 'manager'
                        ? 'border-beechwood-600 bg-beechwood-50 dark:bg-beechwood-900/30 dark:border-beechwood-400'
                        : 'border-gray-200 dark:border-gray-600 hover:border-beechwood-300 dark:hover:border-beechwood-500 bg-white dark:bg-gray-700'
                    }`}
                    onClick={() => setFormData({ ...formData, role: 'manager' })}
                  >
                    <Shield className="w-8 h-8 text-beechwood-600 dark:text-beechwood-400" />
                    <div className="text-left">
                      <span className="font-semibold block text-gray-900 dark:text-white">Department Manager</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Oversees team leads & employees</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`p-4 border-2 rounded-lg flex items-center gap-3 transition ${
                      formData.role === 'team_lead'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-700'
                    }`}
                    onClick={() => setFormData({ ...formData, role: 'team_lead' })}
                  >
                    <UserCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    <div className="text-left">
                      <span className="font-semibold block text-gray-900 dark:text-white">Team Lead</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Manages employee schedules</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`p-4 border-2 rounded-lg flex items-center gap-3 transition ${
                      formData.role === 'employee'
                        ? 'border-green-600 bg-green-50 dark:bg-green-900/30 dark:border-green-400'
                        : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 bg-white dark:bg-gray-700'
                    }`}
                    onClick={() => setFormData({ ...formData, role: 'employee' })}
                  >
                    <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
                    <div className="text-left">
                      <span className="font-semibold block text-gray-900 dark:text-white">Employee</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Claim shifts & request time off</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-beechwood-600 hover:bg-beechwood-700 dark:bg-beechwood-700 dark:hover:bg-beechwood-600 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : (isRegistering ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering)
                setError('')
              }}
              className="text-beechwood-600 hover:text-beechwood-700 dark:text-beechwood-400 dark:hover:text-beechwood-300 font-medium"
            >
              {isRegistering
                ? 'Already have an account? Sign in'
                : "Don't have an account? Register"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-beechwood-600 dark:text-beechwood-400">
          <p>Professional workforce scheduling solution</p>
          <p className="mt-1 text-xs">Manager → Team Lead → Employee</p>
        </div>
      </div>
    </div>
  )
}
