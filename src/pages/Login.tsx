import { useState } from 'react'
import { Calendar, Users } from 'lucide-react'

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

    console.log('🔵 Form submitted:', isRegistering ? 'REGISTER' : 'LOGIN')
    console.log('🔵 Form data:', { ...formData, password: '***' })

    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login'
      console.log('🔵 Calling endpoint:', endpoint)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      console.log('🔵 Response status:', response.status)
      const data = await response.json()
      console.log('🔵 Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed')
      }

      console.log('✅ Login successful!')
      onLogin(data.user, data.token)
    } catch (err: any) {
      console.error('❌ Login error:', err.message)
      setError(err.message || 'Network error - is the server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-beechwood-100 to-beechwood-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Calendar className="w-12 h-12 text-beechwood-700" />
          </div>
          <h1 className="text-4xl font-bold text-beechwood-900 mb-2">Shift Manager</h1>
          <p className="text-beechwood-600">by Beechwood</p>
        </div>

        {/* Login/Register Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-beechwood-500 focus:border-transparent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-beechwood-500 focus:border-transparent"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-beechwood-500 focus:border-transparent"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`p-4 border-2 rounded-lg flex flex-col items-center transition ${
                      formData.role === 'employee'
                        ? 'border-beechwood-600 bg-beechwood-50'
                        : 'border-gray-200 hover:border-beechwood-300'
                    }`}
                    onClick={() => setFormData({ ...formData, role: 'employee' })}
                  >
                    <Users className="w-8 h-8 mb-2" />
                    <span className="font-medium">Employee</span>
                  </button>
                  <button
                    type="button"
                    className={`p-4 border-2 rounded-lg flex flex-col items-center transition ${
                      formData.role === 'supervisor'
                        ? 'border-beechwood-600 bg-beechwood-50'
                        : 'border-gray-200 hover:border-beechwood-300'
                    }`}
                    onClick={() => setFormData({ ...formData, role: 'supervisor' })}
                  >
                    <Calendar className="w-8 h-8 mb-2" />
                    <span className="font-medium">Supervisor</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-beechwood-600 hover:bg-beechwood-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="text-beechwood-600 hover:text-beechwood-700 font-medium"
            >
              {isRegistering
                ? 'Already have an account? Sign in'
                : "Don't have an account? Register"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-beechwood-600">
          <p>Professional shift management solution</p>
        </div>
      </div>
    </div>
  )
}
