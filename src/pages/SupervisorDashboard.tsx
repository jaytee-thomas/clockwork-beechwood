import { useState, useEffect } from 'react'
import { LogOut, Calendar, Clock, CheckCircle, XCircle, Plus, Users, TrendingUp, Zap } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface Shift {
  id: number
  date: string
  startTime: string
  endTime: string
  category: string
  status: string
  claimedBy?: number
  claimedByName?: string
}

interface TimeOffRequest {
  id: number
  userId: number
  userName: string
  date: string
  reason: string
  status: string
}

export default function SupervisorDashboard({ user, onLogout }: any) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [pendingClaims, setPendingClaims] = useState<Shift[]>([])
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [showCreateShift, setShowCreateShift] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'shifts' | 'claims' | 'timeoff'>('overview')
  const [newShift, setNewShift] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    category: 'Morning',
    isOvertime: false
  })

  useEffect(() => {
    fetchShifts()
    fetchPendingClaims()
    fetchTimeOffRequests()
  }, [])

  const fetchShifts = async () => {
    const response = await fetch('/api/shifts/all', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setShifts(data)
  }

  const fetchPendingClaims = async () => {
    const response = await fetch('/api/shifts/pending-claims', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setPendingClaims(data)
  }

  const fetchTimeOffRequests = async () => {
    const response = await fetch('/api/timeoff/all-requests', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setTimeOffRequests(data)
  }

  const createShift = async () => {
    try {
      const response = await fetch('/api/shifts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newShift)
      })

      if (response.ok) {
        fetchShifts()
        setShowCreateShift(false)
        setNewShift({
          date: format(new Date(), 'yyyy-MM-dd'),
          startTime: '09:00',
          endTime: '17:00',
          category: 'Morning'
        })
        alert('Shift created successfully!')
      }
    } catch (error) {
      alert('Error creating shift')
    }
  }

  const handleClaimApproval = async (shiftId: number, approved: boolean) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/${approved ? 'approve' : 'reject'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        fetchShifts()
        fetchPendingClaims()
        alert(`Shift ${approved ? 'approved' : 'rejected'}!`)
      }
    } catch (error) {
      alert('Error processing claim')
    }
  }

  const handleTimeOffRequest = async (requestId: number, approved: boolean) => {
    try {
      const response = await fetch(`/api/timeoff/${requestId}/${approved ? 'approve' : 'reject'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        fetchTimeOffRequests()
        fetchShifts()
        alert(`Time off request ${approved ? 'approved' : 'rejected'}!`)
      }
    } catch (error) {
      alert('Error processing time off request')
    }
  }

  const stats = {
    totalShifts: shifts.length,
    availableShifts: shifts.filter(s => s.status === 'available').length,
    pendingApprovals: pendingClaims.length,
    pendingTimeOff: timeOffRequests.filter(r => r.status === 'pending').length
  }

  return (
    <div className="min-h-screen bg-beechwood-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-beechwood-900">Shift Manager</h1>
            <p className="text-sm text-gray-600">Supervisor • {user.name}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'overview'
                ? 'border-b-2 border-beechwood-600 text-beechwood-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'shifts'
                ? 'border-b-2 border-beechwood-600 text-beechwood-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Shifts
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`pb-3 px-4 font-medium transition relative ${
              activeTab === 'claims'
                ? 'border-b-2 border-beechwood-600 text-beechwood-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Claims
            {stats.pendingApprovals > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {stats.pendingApprovals}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('timeoff')}
            className={`pb-3 px-4 font-medium transition relative ${
              activeTab === 'timeoff'
                ? 'border-b-2 border-beechwood-600 text-beechwood-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Time Off Requests
            {stats.pendingTimeOff > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {stats.pendingTimeOff}
              </span>
            )}
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Shifts</p>
                    <p className="text-3xl font-bold text-beechwood-900">{stats.totalShifts}</p>
                  </div>
                  <Calendar className="w-12 h-12 text-beechwood-600 opacity-20" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Available</p>
                    <p className="text-3xl font-bold text-green-600">{stats.availableShifts}</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-600 opacity-20" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Pending Claims</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
                  </div>
                  <Clock className="w-12 h-12 text-yellow-600 opacity-20" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Time Off Requests</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.pendingTimeOff}</p>
                  </div>
                  <Users className="w-12 h-12 text-purple-600 opacity-20" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowCreateShift(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-beechwood-600 hover:bg-beechwood-700 text-white rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  Create New Shift
                </button>
                <button
                  onClick={() => setActiveTab('claims')}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-beechwood-600 text-beechwood-700 hover:bg-beechwood-50 rounded-lg transition"
                >
                  Review Claims ({stats.pendingApprovals})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* All Shifts Tab */}
        {activeTab === 'shifts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">All Shifts</h2>
              <button
                onClick={() => setShowCreateShift(true)}
                className="flex items-center gap-2 px-4 py-2 bg-beechwood-600 hover:bg-beechwood-700 text-white rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                Create Shift
              </button>
            </div>

            {shifts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                No shifts created yet
              </div>
            ) : (
              shifts.map((shift) => (
                <div key={shift.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-beechwood-600" />
                        <span className="font-semibold text-gray-800">
                          {format(parseISO(shift.date), 'EEEE, MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{shift.startTime} - {shift.endTime}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="inline-block px-3 py-1 bg-beechwood-100 text-beechwood-700 rounded-full text-sm">
                          {shift.category}
                        </span>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                          shift.status === 'available' ? 'bg-green-100 text-green-700' :
                          shift.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {shift.status}
                        </span>
                      </div>
                      {shift.claimedByName && (
                        <div className="mt-2 text-sm text-gray-600">
                          Claimed by: {shift.claimedByName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pending Claims Tab */}
        {activeTab === 'claims' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Pending Claims</h2>
            {pendingClaims.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                No pending claims
              </div>
            ) : (
              pendingClaims.map((shift) => (
                <div key={shift.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-beechwood-600" />
                        <span className="font-semibold text-gray-800">
                          {format(parseISO(shift.date), 'EEEE, MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{shift.startTime} - {shift.endTime}</span>
                      </div>
                      <div className="mb-2">
                        <span className="inline-block px-3 py-1 bg-beechwood-100 text-beechwood-700 rounded-full text-sm">
                          {shift.category}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <strong>Claimed by:</strong> {shift.claimedByName}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleClaimApproval(shift.id, true)}
                        className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleClaimApproval(shift.id, false)}
                        className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Time Off Requests Tab */}
        {activeTab === 'timeoff' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Time Off Requests</h2>
            {timeOffRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                No time off requests
              </div>
            ) : (
              timeOffRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 mb-1">
                        {request.userName}
                      </div>
                      <div className="text-gray-700 mb-2">
                        {format(parseISO(request.date), 'EEEE, MMM dd, yyyy')}
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        <strong>Reason:</strong> {request.reason}
                      </div>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        request.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTimeOffRequest(request.id, true)}
                          className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleTimeOffRequest(request.id, false)}
                          className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Shift Modal */}
      {showCreateShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New Shift</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={newShift.date}
                  onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-beechwood-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-beechwood-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-beechwood-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newShift.category}
                  onChange={(e) => setNewShift({ ...newShift, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-beechwood-500 focus:border-transparent"
                >
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Evening</option>
                  <option>Night</option>
                  <option>Weekend</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newShift.isOvertime || false}
                    onChange={(e) => setNewShift({ ...newShift, isOvertime: e.target.checked })}
                    className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    Mark as OVERTIME (will notify all employees)
                  </span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={createShift}
                  className="flex-1 px-4 py-2 bg-beechwood-600 hover:bg-beechwood-700 text-white rounded-lg transition"
                >
                  Create Shift
                </button>
                <button
                  onClick={() => setShowCreateShift(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

