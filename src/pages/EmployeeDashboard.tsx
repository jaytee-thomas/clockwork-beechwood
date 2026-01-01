import { useState, useEffect } from 'react'
import { LogOut, Calendar, Clock, CheckCircle, XCircle, Plus, Bell, Zap, AlertTriangle, PhoneOff } from 'lucide-react'
import ReactCalendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format, parseISO, isSameDay } from 'date-fns'
import ThemeToggle from '../components/ThemeToggle'

interface Shift {
  id: number
  date: string
  startTime: string
  endTime: string
  category: string
  isOvertime: number
  isCallIn: number
  callInBy: number
  callInByName?: string
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
  requiresResponse: number
  createdAt: string
}

export default function EmployeeDashboard({ user, onLogout }: any) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [overtimeShifts, setOvertimeShifts] = useState<Shift[]>([])
  const [callInShifts, setCallInShifts] = useState<Shift[]>([])
  const [myShifts, setMyShifts] = useState<Shift[]>([])
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)
  const [showCallInModal, setShowCallInModal] = useState(false)
  const [selectedCallInShift, setSelectedCallInShift] = useState<Shift | null>(null)
  const [timeOffReason, setTimeOffReason] = useState('')
  const [activeTab, setActiveTab] = useState<'callins' | 'overtime' | 'available' | 'myShifts' | 'timeOff'>('callins')

  useEffect(() => {
    fetchShifts()
    fetchOvertimeShifts()
    fetchCallInShifts()
    fetchMyShifts()
    fetchTimeOffRequests()
    fetchNotifications()
    fetchUnreadCount()

    const interval = setInterval(() => {
      fetchNotifications()
      fetchUnreadCount()
      fetchCallInShifts()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const fetchShifts = async () => {
    const response = await fetch('/api/shifts/available', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setShifts(data.filter((s: Shift) => !s.isOvertime && !s.isCallIn))
  }

  const fetchOvertimeShifts = async () => {
    const response = await fetch('/api/shifts/overtime', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setOvertimeShifts(data)
  }

  const fetchCallInShifts = async () => {
    const response = await fetch('/api/shifts/call-ins', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await response.json()
    setCallInShifts(data)
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

  const handleCallInClick = async (shiftId: number) => {
    if (!confirm('Are you sure you need to call in for this shift? This will notify all employees immediately.')) {
      return
    }

    try {
      const response = await fetch(`/api/shifts/${shiftId}/call-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        fetchMyShifts()
        fetchCallInShifts()
        alert('Call-in posted! All employees have been notified.')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to post call-in')
      }
    } catch (error) {
      alert('Error posting call-in')
    }
  }

  const handleCallInResponse = (shift: Shift) => {
    setSelectedCallInShift(shift)
    setShowCallInModal(true)
  }

  const acceptCallIn = async () => {
    if (!selectedCallInShift) return

    try {
      const response = await fetch(`/api/shifts/${selectedCallInShift.id}/accept-call-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        setShowCallInModal(false)
        setSelectedCallInShift(null)
        fetchCallInShifts()
        fetchMyShifts()
        alert('You have successfully accepted this call-in shift!')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to accept call-in')
      }
    } catch (error) {
      alert('Error accepting call-in')
    }
  }

  const declineCallIn = () => {
    setShowCallInModal(false)
    setSelectedCallInShift(null)
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
        alert('Shift claimed! Waiting for approval.')
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
    return [...shifts, ...overtimeShifts, ...callInShifts, ...myShifts].filter(shift =>
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
                  shift.isCallIn 
                    ? 'bg-red-600' 
                    : shift.isOvertime 
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

  const renderShiftCard = (shift: Shift, showCallInButton = false) => (
    <div key={shift.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${
      shift.isCallIn 
        ? 'border-2 border-red-500 dark:border-red-600 bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-gray-800' 
        : shift.isOvertime 
        ? 'border-2 border-yellow-400 dark:border-yellow-500 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-900/20 dark:to-gray-800' 
        : ''
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {shift.isCallIn && (
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 fill-red-600 dark:fill-red-400" />
              <span className="font-bold text-red-700 dark:text-red-400 text-sm uppercase tracking-wide">URGENT CALL-IN</span>
            </div>
          )}
          {shift.isOvertime && !shift.isCallIn && (
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
              <span className="font-bold text-yellow-700 dark:text-yellow-400 text-sm uppercase tracking-wide">OVERTIME</span>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-beechwood-600 dark:text-beechwood-400" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {format(parseISO(shift.date), 'EEEE, MMM dd, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{shift.startTime} - {shift.endTime}</span>
          </div>
          {shift.isCallIn && shift.callInByName && (
            <div className="mt-2 text-sm text-red-700 dark:text-red-400 font-medium">
              Coverage needed for: {shift.callInByName}
            </div>
          )}
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm ${
              shift.isCallIn
                ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 font-semibold'
                : shift.isOvertime 
                ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 font-semibold' 
                : 'bg-beechwood-100 dark:bg-beechwood-900/40 text-beechwood-700 dark:text-beechwood-300'
            }`}>
              {shift.category}
            </span>
          </div>
        </div>
        {showCallInButton && shift.status === 'approved' && (
          <button
            onClick={() => handleCallInClick(shift.id)}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition font-semibold flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            Call In
          </button>
        )}
        {(shift.status === 'available' || shift.status === 'call-in') && (
          <button
            onClick={() => shift.isCallIn ? handleCallInResponse(shift) : claimShift(shift.id)}
            className={`px-6 py-2 rounded-lg transition font-semibold ${
              shift.isCallIn
                ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white shadow-lg'
                : shift.isOvertime
                ? 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white shadow-lg'
                : 'bg-beechwood-600 hover:bg-beechwood-700 dark:bg-beechwood-700 dark:hover:bg-beechwood-600 text-white'
            }`}
          >
            {shift.isCallIn ? 'Cover Shift' : shift.isOvertime ? 'Claim OT' : 'Claim Shift'}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-beechwood-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-beechwood-900 dark:text-white">ClockWork</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Welcome, {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
                    <h3 className="font-semibold text-gray-800 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-sm text-beechwood-600 dark:text-beechwood-400 hover:text-beechwood-700 dark:hover:text-beechwood-300"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                          !notif.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                        onClick={() => !notif.isRead && markAsRead(notif.id)}
                      >
                        <div className="flex items-start gap-3">
                          {notif.type === 'call-in' ? (
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 fill-red-600 dark:fill-red-400 flex-shrink-0 mt-1" />
                          ) : notif.type === 'call-in-filled' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                          ) : (
                            <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400 flex-shrink-0 mt-1" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{notif.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notif.message}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
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
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('callins')}
            className={`pb-3 px-4 font-medium transition relative flex-shrink-0 ${
              activeTab === 'callins'
                ? 'border-b-2 border-red-600 dark:border-red-500 text-red-700 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Call-Ins
              {callInShifts.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold animate-pulse">
                  {callInShifts.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('overtime')}
            className={`pb-3 px-4 font-medium transition relative flex-shrink-0 ${
              activeTab === 'overtime'
                ? 'border-b-2 border-yellow-600 dark:border-yellow-500 text-yellow-700 dark:text-yellow-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
            className={`pb-3 px-4 font-medium transition flex-shrink-0 ${
              activeTab === 'available'
                ? 'border-b-2 border-beechwood-600 dark:border-beechwood-500 text-beechwood-700 dark:text-beechwood-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Available Shifts
          </button>
          <button
            onClick={() => setActiveTab('myShifts')}
            className={`pb-3 px-4 font-medium transition flex-shrink-0 ${
              activeTab === 'myShifts'
                ? 'border-b-2 border-beechwood-600 dark:border-beechwood-500 text-beechwood-700 dark:text-beechwood-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            My Shifts
          </button>
          <button
            onClick={() => setActiveTab('timeOff')}
            className={`pb-3 px-4 font-medium transition flex-shrink-0 ${
              activeTab === 'timeOff'
                ? 'border-b-2 border-beechwood-600 dark:border-beechwood-500 text-beechwood-700 dark:text-beechwood-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Time Off
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <ReactCalendar
                onChange={(value: any) => setSelectedDate(value)}
                value={selectedDate}
                tileContent={tileContent}
                className="border-none w-full dark:bg-gray-800 dark:text-white"
              />
              
              {selectedDateShifts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {format(selectedDate, 'MMM dd, yyyy')}
                  </h3>
                  {selectedDateShifts.map((shift) => (
                    <div key={shift.id} className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-2">
                      {shift.isCallIn && <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400 fill-red-600 dark:fill-red-400" />}
                      {shift.isOvertime && !shift.isCallIn && <Zap className="w-3 h-3 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />}
                      {shift.startTime} - {shift.endTime} ({shift.category})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'callins' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/40 dark:to-red-800/20 border-l-4 border-red-500 dark:border-red-600 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 fill-red-600 dark:fill-red-400" />
                    <div>
                      <h2 className="text-xl font-bold text-red-900 dark:text-red-200">Urgent: Call-In Coverage Needed</h2>
                      <p className="text-sm text-red-700 dark:text-red-300">Someone needs coverage ASAP. Be the first to help!</p>
                    </div>
                  </div>
                </div>

                {callInShifts.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
                    No call-in coverage needed at the moment
                  </div>
                ) : (
                  callInShifts.map(shift => renderShiftCard(shift))
                )}
              </div>
            )}

            {activeTab === 'overtime' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/40 dark:to-yellow-800/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
                    <div>
                      <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-200">Overtime Shifts Available</h2>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">Claim these high-priority shifts now!</p>
                    </div>
                  </div>
                </div>

                {overtimeShifts.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
                    No overtime shifts available at the moment
                  </div>
                ) : (
                  overtimeShifts.map(shift => renderShiftCard(shift))
                )}
              </div>
            )}

            {activeTab === 'available' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Available Shifts</h2>
                {shifts.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
                    No available shifts at the moment
                  </div>
                ) : (
                  shifts.map(shift => renderShiftCard(shift))
                )}
              </div>
            )}

            {activeTab === 'myShifts' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">My Shifts</h2>
                {myShifts.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
                    You haven't claimed any shifts yet
                  </div>
                ) : (
                  myShifts.map((shift) => renderShiftCard(shift, true))
                )}
              </div>
            )}

            {activeTab === 'timeOff' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Time Off Requests</h2>
                  <button
                    onClick={() => setShowTimeOffModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-beechwood-600 hover:bg-beechwood-700 dark:bg-beechwood-700 dark:hover:bg-beechwood-600 text-white rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                    Request Time Off
                  </button>
                </div>

                {timeOffRequests.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
                    No time off requests
                  </div>
                ) : (
                  timeOffRequests.map((request) => (
                    <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                            {format(parseISO(request.date), 'EEEE, MMM dd, yyyy')}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 text-sm">{request.reason}</div>
                        </div>
                        <div>
                          {request.status === 'pending' && (
                            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
                              <Clock className="w-4 h-4" />
                              Pending
                            </span>
                          )}
                          {request.status === 'approved' && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                              <CheckCircle className="w-4 h-4" />
                              Approved
                            </span>
                          )}
                          {request.status === 'rejected' && (
                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
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

      {/* Call-In Response Modal */}
      {showCallInModal && selectedCallInShift && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-8 border-4 border-red-500 dark:border-red-600">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400 fill-red-600 dark:fill-red-400" />
              <h3 className="text-2xl font-bold text-red-900 dark:text-red-200">Urgent Coverage Needed!</h3>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 mb-6">
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>{selectedCallInShift.callInByName}</strong> needs coverage for:
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {format(parseISO(selectedCallInShift.date), 'EEEE, MMM dd, yyyy')}
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                {selectedCallInShift.startTime} - {selectedCallInShift.endTime}
              </div>
              <div className="mt-2">
                <span className="inline-block px-3 py-1 bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-200 rounded-full text-sm font-semibold">
                  {selectedCallInShift.category}
                </span>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-6 text-center font-semibold">
              Can you cover this shift?
            </p>

            <div className="flex gap-3">
              <button
                onClick={acceptCallIn}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg transition font-bold text-lg shadow-lg"
              >
                ✓ YES, I'll Cover It
              </button>
              <button
                onClick={declineCallIn}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition font-semibold"
              >
                No, Thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Off Modal */}
      {showTimeOffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Request Time Off</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="text"
                  readOnly
                  value={format(selectedDate, 'MMM dd, yyyy')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason
                </label>
                <textarea
                  value={timeOffReason}
                  onChange={(e) => setTimeOffReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-beechwood-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  rows={3}
                  placeholder="Personal, Medical, Vacation, etc."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={requestTimeOff}
                  className="flex-1 px-4 py-2 bg-beechwood-600 hover:bg-beechwood-700 dark:bg-beechwood-700 dark:hover:bg-beechwood-600 text-white rounded-lg transition"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => {
                    setShowTimeOffModal(false)
                    setTimeOffReason('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition"
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
