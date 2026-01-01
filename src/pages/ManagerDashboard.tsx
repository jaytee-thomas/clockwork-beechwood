import { useState, useEffect } from 'react'
import { LogOut, Calendar, Clock, CheckCircle, XCircle, Plus, Bell, Users, TrendingUp, Zap, AlertTriangle } from 'lucide-react'
import ReactCalendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format, parseISO } from 'date-fns'
import ThemeToggle from '../components/ThemeToggle'

interface User {
  id: number
  name: string
  email: string
  role: string
  teamLeadId?: number
  employeeCount?: number
}

interface Shift {
  id: number
  date: string
  startTime: string
  endTime: string
  category: string
  isOvertime: number
  isCallIn: number
  status: string
  claimedBy?: number
  claimedByName?: string
  teamLeadName?: string
  approvedByTeamLead: number
  approvedByManager: number
}

interface TimeOffRequest {
  id: number
  userId: number
  userName: string
  date: string
  reason: string
  status: string
  approvedByTeamLead: number
  approvedByManager: number
}

export default function ManagerDashboard({ user, onLogout }: any) {
  const [teamLeads, setTeamLeads] = useState<User[]>([])
  const [employees, setEmployees] = useState<User[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [pendingClaims, setPendingClaims] = useState<Shift[]>([])
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null)
  const [newShift, setNewShift] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    category: '1st Shift',
    isOvertime: false,
    teamLeadId: ''
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'shifts' | 'pending' | 'timeoff' | 'team'>('overview')

  useEffect(() => {
    fetchTeamLeads()
    fetchEmployees()
    fetchShifts()
    fetchPendingClaims()
    fetchTimeOffRequests()
    fetchUnreadCount()

    const interval = setInterval(() => {
      fetchPendingClaims()
      fetchUnreadCount()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const fetchTeamLeads = async () => {
    const response = await fetch('/api/users/team-leads', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setTeamLeads(data)
  }

  const fetchEmployees = async () => {
    const response = await fetch('/api/users/employees', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setEmployees(data)
  }

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

  const fetchUnreadCount = async () => {
    const response = await fetch('/api/notifications/unread-count', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setUnreadCount(data.count)
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
        setShowCreateModal(false)
        setNewShift({
          date: format(new Date(), 'yyyy-MM-dd'),
          startTime: '09:00',
          endTime: '17:00',
          category: '1st Shift',
          isOvertime: false,
          teamLeadId: ''
        })
        alert('Shift created successfully!')
      }
    } catch (error) {
      alert('Error creating shift')
    }
  }

  const approveShift = async (shiftId: number) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/approve-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        fetchShifts()
        fetchPendingClaims()
        alert('Shift approved!')
      }
    } catch (error) {
      alert('Error approving shift')
    }
  }

  const rejectShift = async (shiftId: number) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        fetchShifts()
        fetchPendingClaims()
        alert('Shift claim rejected')
      }
    } catch (error) {
      alert('Error rejecting shift')
    }
  }

  const approveTimeOff = async (requestId: number) => {
    try {
      const response = await fetch(`/api/timeoff/${requestId}/approve-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        fetchTimeOffRequests()
        alert('Time off approved!')
      }
    } catch (error) {
      alert('Error approving time off')
    }
  }

  const rejectTimeOff = async (requestId: number) => {
    try {
      const response = await fetch(`/api/timeoff/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        fetchTimeOffRequests()
        alert('Time off rejected')
      }
    } catch (error) {
      alert('Error rejecting time off')
    }
  }

  const assignTeamLead = async (teamLeadId: string) => {
    if (!selectedEmployee) return

    try {
      const response = await fetch(`/api/users/${selectedEmployee.id}/assign-team-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ teamLeadId: teamLeadId ? parseInt(teamLeadId) : null })
      })

      if (response.ok) {
        fetchEmployees()
        setShowAssignModal(false)
        setSelectedEmployee(null)
        alert('Team lead assigned successfully!')
      }
    } catch (error) {
      alert('Error assigning team lead')
    }
  }

  const stats = {
    totalShifts: shifts.length,
    availableShifts: shifts.filter(s => s.status === 'available').length,
    pendingApprovals: pendingClaims.length,
    pendingTimeOff: timeOffRequests.filter(r => r.status === 'pending' || r.status === 'pending-manager').length,
    totalTeamLeads: teamLeads.length,
    totalEmployees: employees.length
  }

  return (
    <div className="min-h-screen bg-beechwood-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-beechwood-800 to-beechwood-700 dark:from-beechwood-900 dark:to-gray-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">ClockWork - Manager</h1>
              <p className="text-beechwood-200 dark:text-beechwood-300 mt-1">Welcome, {user.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Shifts</p>
                <p className="text-3xl font-bold text-beechwood-800 dark:text-beechwood-400">{stats.totalShifts}</p>
              </div>
              <Calendar className="w-12 h-12 text-beechwood-400 dark:text-beechwood-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Approvals</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingApprovals}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-400 dark:text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Team Leads</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalTeamLeads}</p>
              </div>
              <Users className="w-12 h-12 text-blue-400 dark:text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Employees</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.totalEmployees}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-400 dark:text-green-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-4 font-medium transition flex-shrink-0 ${
              activeTab === 'overview'
                ? 'border-b-2 border-beechwood-600 dark:border-beechwood-500 text-beechwood-700 dark:text-beechwood-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 px-4 font-medium transition flex-shrink-0 ${
              activeTab === 'pending'
                ? 'border-b-2 border-beechwood-600 dark:border-beechwood-500 text-beechwood-700 dark:text-beechwood-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Pending Approvals
            {stats.pendingApprovals > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {stats.pendingApprovals}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`pb-3 px-4 font-medium transition flex-shrink-0 ${
              activeTab === 'shifts'
                ? 'border-b-2 border-beechwood-600 dark:border-beechwood-500 text-beechwood-700 dark:text-beechwood-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            All Shifts
          </button>
          <button
            onClick={() => setActiveTab('timeoff')}
            className={`pb-3 px-4 font-medium transition flex-shrink-0 ${
              activeTab === 'timeoff'
                ? 'border-b-2 border-beechwood-600 dark:border-beechwood-500 text-beechwood-700 dark:text-beechwood-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Time Off Requests
            {stats.pendingTimeOff > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-2 py-0.5">
                {stats.pendingTimeOff}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-3 px-4 font-medium transition flex-shrink-0 ${
              activeTab === 'team'
                ? 'border-b-2 border-beechwood-600 dark:border-beechwood-500 text-beechwood-700 dark:text-beechwood-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Team Management
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Dashboard Overview</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-beechwood-600 hover:bg-beechwood-700 dark:bg-beechwood-700 dark:hover:bg-beechwood-600 text-white rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  Create Shift
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Team Leads</h3>
                  {teamLeads.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No team leads yet</p>
                  ) : (
                    <div className="space-y-3">
                      {teamLeads.map(lead => (
                        <div key={lead.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{lead.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{lead.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-beechwood-700 dark:text-beechwood-400">
                              {lead.employeeCount || 0} employees
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {pendingClaims.slice(0, 5).map(claim => (
                      <div key={claim.id} className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{claim.claimedByName}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Shift claim pending approval</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'pending' && (
            <>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Pending Shift Approvals</h2>
              {pendingClaims.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
                  No pending approvals
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingClaims.map(shift => (
                    <div key={shift.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {shift.isCallIn && (
                            <span className="inline-block px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 text-xs font-semibold rounded-full mb-2">
                              CALL-IN COVERAGE
                            </span>
                          )}
                          {shift.isOvertime && !shift.isCallIn && (
                            <span className="inline-block px-3 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 text-xs font-semibold rounded-full mb-2">
                              OVERTIME
                            </span>
                          )}
                          <div className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            {format(parseISO(shift.date), 'EEEE, MMM dd, yyyy')}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                            {shift.startTime} - {shift.endTime} • {shift.category}
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Claimed by:</span>{' '}
                            <span className="font-medium text-gray-800 dark:text-gray-200">{shift.claimedByName}</span>
                          </div>
                          {shift.approvedByTeamLead === 1 && (
                            <div className="mt-2">
                              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                Approved by Team Lead
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveShift(shift.id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectShift(shift.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg transition"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'shifts' && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">All Shifts</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-beechwood-600 hover:bg-beechwood-700 dark:bg-beechwood-700 dark:hover:bg-beechwood-600 text-white rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  Create Shift
                </button>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Team Lead</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Claimed By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {shifts.map(shift => (
                      <tr key={shift.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {format(parseISO(shift.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {shift.startTime} - {shift.endTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {shift.category}
                          {shift.isOvertime === 1 && (
                            <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded">OT</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {shift.teamLeadName || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {shift.claimedByName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            shift.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' :
                            shift.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}>
                            {shift.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'timeoff' && (
            <>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Time Off Requests</h2>
              {timeOffRequests.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
                  No time off requests
                </div>
              ) : (
                <div className="space-y-4">
                  {timeOffRequests.map(request => (
                    <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            {request.userName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {format(parseISO(request.date), 'EEEE, MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Reason: {request.reason}
                          </div>
                          {request.approvedByTeamLead === 1 && (
                            <div className="mt-2">
                              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                Approved by Team Lead
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          {request.status === 'pending' || request.status === 'pending-manager' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => approveTimeOff(request.id)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectTimeOff(request.id)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg transition"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              request.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' :
                              'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                            }`}>
                              {request.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'team' && (
            <>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Team Management</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Team Leads</h3>
                  {teamLeads.map(lead => (
                    <div key={lead.id} className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{lead.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{lead.email}</p>
                      <p className="text-xs text-beechwood-700 dark:text-beechwood-400 mt-1">
                        Managing {lead.employeeCount || 0} employees
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Employees</h3>
                  <div className="space-y-3">
                    {employees.map(emp => (
                      <div key={emp.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{emp.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{emp.email}</p>
                          {emp.teamLeadId && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Assigned to Team Lead
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp)
                            setShowAssignModal(true)
                          }}
                          className="px-3 py-1 text-sm bg-beechwood-600 hover:bg-beechwood-700 dark:bg-beechwood-700 dark:hover:bg-beechwood-600 text-white rounded transition"
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Shift Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Create New Shift</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  value={newShift.date}
                  onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time</label>
                  <input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <select
                  value={newShift.category}
                  onChange={(e) => setNewShift({ ...newShift, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                >
                  <option>1st Shift</option>
                  <option>2nd Shift</option>
                  <option>Floater</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign to Team Lead</label>
                <select
                  value={newShift.teamLeadId}
                  onChange={(e) => setNewShift({ ...newShift, teamLeadId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                >
                  <option value="">Unassigned</option>
                  {teamLeads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newShift.isOvertime}
                    onChange={(e) => setNewShift({ ...newShift, isOvertime: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    Mark as OVERTIME
                  </span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={createShift}
                  className="flex-1 px-4 py-2 bg-beechwood-600 hover:bg-beechwood-700 dark:bg-beechwood-700 dark:hover:bg-beechwood-600 text-white rounded-lg transition"
                >
                  Create Shift
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Team Lead Modal */}
      {showAssignModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Assign Team Lead to {selectedEmployee.name}
            </h3>
            <div className="space-y-4">
              <select
                defaultValue={selectedEmployee.teamLeadId || ''}
                onChange={(e) => assignTeamLead(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
              >
                <option value="">Unassigned</option>
                {teamLeads.map(lead => (
                  <option key={lead.id} value={lead.id}>{lead.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedEmployee(null)
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
