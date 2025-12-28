import { useState, useEffect } from 'react'
import { LogOut, Calendar as CalendarIcon, Clock, CheckCircle, XCircle, Plus, Bell, Zap } from 'lucide-react'
import ReactCalendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format, parseISO, isSameDay } from 'date-fns'

interface Shift {
  id: number
  date: string
  startTime: string
  endTime: string
  category: string
  isOvertime: number
  status: string
  claimedBy?: number
  claimedByName?: string
}

interface TimeOffRequest {
  id: number
  date: string
  reason: string
  status: string
}

interface Notification {
  id: number
  type: string
  title: string
  message: string
  shiftId: number
  isRead: number
  createdAt: string
}

export default function EmployeeDashboard({ user, onLogout }: any) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [overtimeShifts, setOvertimeShifts] = useState<Shift[]>([])
  const [myShifts, setMyShifts] = useState<Shift[]>([])
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)
  const [timeOffReason, setTimeOffReason] = useState('')
  const [activeTab, setActiveTab] = useState<'overtime' | 'available' | 'myShifts' | 'timeOff'>('overtime')

  useEffect(() => {
    fetchShifts()
    fetchOvertimeShifts()
    fetchMyShifts()
    fetchTimeOffRequests()
    fetchNotifications()
    fetchUnreadCount()

    // Poll for new notifications every 10 seconds
    const interval = setInterval(() => {
      fetchNotifications()
      fetchUnreadCount()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const fetchShifts = async () => {
    const response = await fetch('/api/shifts/available', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setShifts(data.filter((s: Shift) => !s.isOvertime))
  }

  const fetchOvertimeShifts = async () => {
    const response = await fetch('/api/shifts/overtime', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setOvertimeShifts(data)
  }

  const fetchMyShifts = async () => {
    const response = await fetch('/api/shifts/my-shifts', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setMyShifts(data)
  }

  const fetchTimeOffRequests = async () => {
    const response = await fetch('/api/timeoff/my-requests', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setTimeOffRequests(data)
  }

  const fetchNotifications = async () => {
    const response = await fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setNotifications(data)
  }

  const fetchUnreadCount = async () => {
    const response = await fetch('/api/notifications/unread-count', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setUnreadCount(data.count)
  }

  const markAsRead = async (notificationId: number) => {
    await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    fetchNotifications()
    fetchUnreadCount()
  }

  const markAllAsRead = async () => {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    fetchNotifications()
    fetchUnreadCount()
  }

  const claimShift = async (shiftId: number) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        fetchShifts()
        fetchOvertimeShifts()
        fetchMyShifts()
        alert('Shift claimed! Waiting for supervisor approval.')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to claim shift')
      }
    } catch (error) {
      alert('Error claiming shift')
    }
  }

  const requestTimeOff = async () => {
    try {
      const response = await fetch('/api/timeoff/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          date: format(selectedDate, 'yyyy-MM-dd'),
          reason: timeOffReason
        })
      })

      if (response.ok) {
        fetchTimeOffRequests()
        setShowTimeOffModal(false)
        setTimeOffReason('')
        alert('Time off request submitted!')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to submit request')
      }
    } catch (error) {
      alert('Error submitting time off request')
    }
  }

  const getShiftsForDate = (date: Date) => {
    return [...shifts, ...overtimeShifts, ...myShifts].filter(shift =>
      isSameDay(parseISO(shift.date), date)
    )
  }

  const tileContent = ({ date, view }: any) => {
    if (view === 'month') {
      const dayShifts = getShiftsForDate(date)
      if (dayShifts.length > 0) {
        return (
          <div className="flex justify-center gap-1 mt-1">
            {dayShifts.map((shift, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  shift.isOvertime 
                    ? 'bg-yellow-500' 
                    : shift.status === 'available'
                    ? 'bg-green-500'
                    : shift.status === 'pending'
                    ? 'bg-blue-400'
                    : 'bg-blue-600'
                }`}
              />
            ))}
          </div>
        )
      }
    }
    return null
  }

  const selectedDateShifts = getShiftsForDate(selectedDate)

  const renderShiftCard = (shift: Shift) => (
    <div key={shift.id} className={`bg-white rounded-lg shadow-md p-6 ${shift.isOvertime ? 'border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-white' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {shift.isOvertime && (
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-600 fill-yellow-600" />
              <span className="font-bold text-yellow-700 text-sm uppercase tracking-wide">OVERTIME</span>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="w-5 h-5 text-beechwood-600" />
            <span className="font-semibold text-gray-800">
              {format(parseISO(shift.date), 'EEEE, MMM dd, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{shift.startTime} - {shift.endTime}</span>
          </div>
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm ${
              shift.isOvertime 
                ? 'bg-yellow-100 text-yellow-800 font-semibold' 
                : 'bg-beechwood-100 text-beechwood-700'
            }`}>
              {shift.category}
            </span>
          </div>
        </div>
        <button
          onClick={() => claimShift(shift.id)}
          className={`px-6 py-2 rounded-lg transition font-semibold ${
            shift.isOvertime
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg'
              : 'bg-beechwood-600 hover:bg-beechwood-700 text-white'
          }`}
        >
          Claim {shift.isOvertime ? 'OT' : 'Shift'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-beechwood-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-beechwood-900">Shift Manager</h1>
            <p className="text-sm text-gray-600">Welcome, {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <Bell className="w-6 h-6 text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-sm text-beechwood-600 hover:text-beechwood-700"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          !notif.isRead ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => !notif.isRead && markAsRead(notif.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Zap className="w-5 h-5 text-yellow-600 fill-yellow-600 flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 text-sm">{notif.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(notif.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {!notif.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overtime')}
            className={`pb-3 px-4 font-medium transition relative ${
              activeTab === 'overtime'
                ? 'border-b-2 border-yellow-600 text-yellow-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Overtime
              {overtimeShifts.length > 0 && (
                <span className="bg-yellow-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                  {overtimeShifts.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'available'
                ? 'border-b-2 border-beechwood-600 text-beechwood-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Available Shifts
          </button>
          <button
            onClick={() => setActiveTab('myShifts')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'myShifts'
                ? 'border-b-2 border-beechwood-600 text-beechwood-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Shifts
          </button>
          <button
            onClick={() => setActiveTab('timeOff')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'timeOff'
                ? 'border-b-2 border-beechwood-600 text-beechwood-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Time Off
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <ReactCalendar
                onChange={(value: any) => setSelectedDate(value)}
                value={selectedDate}
                tileContent={tileContent}
                className="border-none w-full"
              />
              
              {selectedDateShifts.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-semibold text-gray-700 mb-2">
                    {format(selectedDate, 'MMM dd, yyyy')}
                  </h3>
                  {selectedDateShifts.map((shift) => (
                    <div key={shift.id} className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                      {shift.isOvertime && <Zap className="w-3 h-3 text-yellow-600 fill-yellow-600" />}
                      {shift.startTime} - {shift.endTime} ({shift.category})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'overtime' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-yellow-600 fill-yellow-600" />
                    <div>
                      <h2 className="text-xl font-bold text-yellow-900">Overtime Shifts Available</h2>
                      <p className="text-sm text-yellow-700">Claim these high-priority shifts now!</p>
                    </div>
                  </div>
                </div>

                {overtimeShifts.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                    No overtime shifts available at the moment
                  </div>
                ) : (
                  overtimeShifts.map(renderShiftCard)
                )}
              </div>
            )}

            {activeTab === 'available' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Shifts</h2>
                {shifts.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                    No available shifts at the moment
                  </div>
                ) : (
                  shifts.map(renderShiftCard)
                )}
              </div>
            )}

            {activeTab === 'myShifts' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">My Shifts</h2>
                {myShifts.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                    You haven't claimed any shifts yet
                  </div>
                ) : (
                  myShifts.map((shift) => (
                    <div key={shift.id} className={`bg-white rounded-lg shadow-md p-6 ${shift.isOvertime ? 'border-2 border-yellow-400' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          {shift.isOvertime && (
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                              <span className="font-bold text-yellow-700 text-xs uppercase">OVERTIME</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <CalendarIcon className="w-5 h-5 text-beechwood-600" />
                            <span className="font-semibold text-gray-800">
                              {format(parseISO(shift.date), 'EEEE, MMM dd, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{shift.startTime} - {shift.endTime}</span>
                          </div>
                          <div className="mt-2">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                              shift.isOvertime ? 'bg-yellow-100 text-yellow-800 font-semibold' : 'bg-beechwood-100 text-beechwood-700'
                            }`}>
                              {shift.category}
                            </span>
                          </div>
                        </div>
                        <div>
                          {shift.status === 'pending' && (
                            <span className="flex items-center gap-1 text-yellow-600 font-medium">
                              <Clock className="w-4 h-4" />
                              Pending Approval
                            </span>
                          )}
                          {shift.status === 'approved' && (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <CheckCircle className="w-4 h-4" />
                              Approved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'timeOff' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Time Off Requests</h2>
                  <button
                    onClick={() => setShowTimeOffModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-beechwood-600 hover:bg-beechwood-700 text-white rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                    Request Time Off
                  </button>
                </div>

                {timeOffRequests.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                    No time off requests
                  </div>
                ) : (
                  timeOffRequests.map((request) => (
                    <div key={request.id} className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-800 mb-1">
                            {format(parseISO(request.date), 'EEEE, MMM dd, yyyy')}
                          </div>
                          <div className="text-gray-600 text-sm">{request.reason}</div>
                        </div>
                        <div>
                          {request.status === 'pending' && (
                            <span className="flex items-center gap-1 text-yellow-600 font-medium">
                              <Clock className="w-4 h-4" />
                              Pending
                            </span>
                          )}
                          {request.status === 'approved' && (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <CheckCircle className="w-4 h-4" />
                              Approved
                            </span>
                          )}
                          {request.status === 'rejected' && (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                              <XCircle className="w-4 h-4" />
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Time Off Modal */}
      {showTimeOffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Request Time Off</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="text"
                  readOnly
                  value={format(selectedDate, 'MMM dd, yyyy')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <textarea
                  value={timeOffReason}
                  onChange={(e) => setTimeOffReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-beechwood-500 focus:border-transparent"
                  rows={3}
                  placeholder="Personal, Medical, Vacation, etc."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={requestTimeOff}
                  className="flex-1 px-4 py-2 bg-beechwood-600 hover:bg-beechwood-700 text-white rounded-lg transition"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => {
                    setShowTimeOffModal(false)
                    setTimeOffReason('')
                  }}
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
