const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Database = require('better-sqlite3')

const app = express()
const JWT_SECRET = 'your-secret-key-change-in-production'

// Middleware
app.use(cors())
app.use(express.json())

console.log('🔧 Starting ClockWork server...')

// Initialize database
let db
try {
  db = new Database('beechwood.db')
  console.log('✅ Database connection established')
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      teamLeadId INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teamLeadId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      category TEXT NOT NULL,
      teamLeadId INTEGER,
      isOvertime INTEGER DEFAULT 0,
      isCallIn INTEGER DEFAULT 0,
      callInBy INTEGER,
      status TEXT DEFAULT 'available',
      claimedBy INTEGER,
      approvedByTeamLead INTEGER DEFAULT 0,
      approvedByManager INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (claimedBy) REFERENCES users(id),
      FOREIGN KEY (callInBy) REFERENCES users(id),
      FOREIGN KEY (teamLeadId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS timeoff_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      approvedByTeamLead INTEGER DEFAULT 0,
      approvedByManager INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      shiftId INTEGER,
      isRead INTEGER DEFAULT 0,
      requiresResponse INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (shiftId) REFERENCES shifts(id)
    );
  `)
  console.log('✅ Database tables created/verified')
  
  // Migrations: Add missing columns if they don't exist
  try {
    // Check if teamLeadId column exists in users table
    const usersInfo = db.prepare("PRAGMA table_info(users)").all()
    const hasTeamLeadId = usersInfo.some(col => col.name === 'teamLeadId')
    
    if (!hasTeamLeadId) {
      console.log('🔄 Adding teamLeadId column to users table...')
      db.exec('ALTER TABLE users ADD COLUMN teamLeadId INTEGER')
      console.log('✅ Added teamLeadId column to users table')
    }
    
    // Check if teamLeadId column exists in shifts table
    const shiftsInfo = db.prepare("PRAGMA table_info(shifts)").all()
    const shiftsHasTeamLeadId = shiftsInfo.some(col => col.name === 'teamLeadId')
    
    if (!shiftsHasTeamLeadId) {
      console.log('🔄 Adding teamLeadId column to shifts table...')
      db.exec('ALTER TABLE shifts ADD COLUMN teamLeadId INTEGER')
      console.log('✅ Added teamLeadId column to shifts table')
    }
    
    // Check if approvedByTeamLead and approvedByManager exist in shifts table
    const shiftsHasApprovedByTeamLead = shiftsInfo.some(col => col.name === 'approvedByTeamLead')
    const shiftsHasApprovedByManager = shiftsInfo.some(col => col.name === 'approvedByManager')
    
    if (!shiftsHasApprovedByTeamLead) {
      console.log('🔄 Adding approvedByTeamLead column to shifts table...')
      db.exec('ALTER TABLE shifts ADD COLUMN approvedByTeamLead INTEGER DEFAULT 0')
      console.log('✅ Added approvedByTeamLead column to shifts table')
    }
    
    if (!shiftsHasApprovedByManager) {
      console.log('🔄 Adding approvedByManager column to shifts table...')
      db.exec('ALTER TABLE shifts ADD COLUMN approvedByManager INTEGER DEFAULT 0')
      console.log('✅ Added approvedByManager column to shifts table')
    }
    
    // Check if approvedByTeamLead and approvedByManager exist in timeoff_requests table
    const timeoffInfo = db.prepare("PRAGMA table_info(timeoff_requests)").all()
    const timeoffHasApprovedByTeamLead = timeoffInfo.some(col => col.name === 'approvedByTeamLead')
    const timeoffHasApprovedByManager = timeoffInfo.some(col => col.name === 'approvedByManager')
    
    if (!timeoffHasApprovedByTeamLead) {
      console.log('🔄 Adding approvedByTeamLead column to timeoff_requests table...')
      db.exec('ALTER TABLE timeoff_requests ADD COLUMN approvedByTeamLead INTEGER DEFAULT 0')
      console.log('✅ Added approvedByTeamLead column to timeoff_requests table')
    }
    
    if (!timeoffHasApprovedByManager) {
      console.log('🔄 Adding approvedByManager column to timeoff_requests table...')
      db.exec('ALTER TABLE timeoff_requests ADD COLUMN approvedByManager INTEGER DEFAULT 0')
      console.log('✅ Added approvedByManager column to timeoff_requests table')
    }
    
    // Check if isCallIn and callInBy exist in shifts table
    const shiftsHasIsCallIn = shiftsInfo.some(col => col.name === 'isCallIn')
    const shiftsHasCallInBy = shiftsInfo.some(col => col.name === 'callInBy')
    
    if (!shiftsHasIsCallIn) {
      console.log('🔄 Adding isCallIn column to shifts table...')
      db.exec('ALTER TABLE shifts ADD COLUMN isCallIn INTEGER DEFAULT 0')
      console.log('✅ Added isCallIn column to shifts table')
    }
    
    if (!shiftsHasCallInBy) {
      console.log('🔄 Adding callInBy column to shifts table...')
      db.exec('ALTER TABLE shifts ADD COLUMN callInBy INTEGER')
      console.log('✅ Added callInBy column to shifts table')
    }
    
    // Check if requiresResponse exists in notifications table
    const notificationsInfo = db.prepare("PRAGMA table_info(notifications)").all()
    const notificationsHasRequiresResponse = notificationsInfo.some(col => col.name === 'requiresResponse')
    
    if (!notificationsHasRequiresResponse) {
      console.log('🔄 Adding requiresResponse column to notifications table...')
      db.exec('ALTER TABLE notifications ADD COLUMN requiresResponse INTEGER DEFAULT 0')
      console.log('✅ Added requiresResponse column to notifications table')
    }
    
    console.log('✅ Database migrations completed')
  } catch (migrationErr) {
    console.error('⚠️ Migration error (may be expected if columns already exist):', migrationErr.message)
  }
} catch (err) {
  console.error('❌ Database error:', err.message)
  process.exit(1)
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access denied' })
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET)
    req.user = verified
    next()
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' })
  }
}

// Helper functions
const notifyAllEmployees = (shiftId, title, message, type = 'overtime', requiresResponse = false) => {
  try {
    const employees = db.prepare('SELECT id FROM users WHERE role = ?').all('employee')
    
    const stmt = db.prepare(
      'INSERT INTO notifications (userId, type, title, message, shiftId, requiresResponse) VALUES (?, ?, ?, ?, ?, ?)'
    )
    
    employees.forEach(employee => {
      stmt.run(employee.id, type, title, message, shiftId, requiresResponse ? 1 : 0)
    })
    
    console.log(`✅ Notified ${employees.length} employees (${type})`)
  } catch (err) {
    console.error('❌ Error sending notifications:', err.message)
  }
}

const notifyTeamLeads = (title, message, type = 'info') => {
  try {
    const teamLeads = db.prepare('SELECT id FROM users WHERE role = ?').all('team_lead')
    
    const stmt = db.prepare(
      'INSERT INTO notifications (userId, type, title, message) VALUES (?, ?, ?, ?)'
    )
    
    teamLeads.forEach(lead => {
      stmt.run(lead.id, type, title, message)
    })
    
    console.log(`✅ Notified ${teamLeads.length} team leads`)
  } catch (err) {
    console.error('❌ Error sending notifications:', err.message)
  }
}

const notifyUser = (userId, title, message, type = 'info', shiftId = null) => {
  try {
    db.prepare(
      'INSERT INTO notifications (userId, type, title, message, shiftId) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, type, title, message, shiftId)
    
    console.log(`✅ Notified user ${userId}`)
  } catch (err) {
    console.error('❌ Error sending notification:', err.message)
  }
}

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date().toISOString() })
})

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role, teamLeadId } = req.body

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Validate role
    if (!['manager', 'team_lead', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = db.prepare(
      'INSERT INTO users (email, password, name, role, teamLeadId) VALUES (?, ?, ?, ?, ?)'
    ).run(email, hashedPassword, name, role, teamLeadId || null)

    const user = { id: result.lastInsertRowid, email, name, role, teamLeadId: teamLeadId || null }
    const token = jwt.sign(user, JWT_SECRET)

    console.log('✅ User registered:', email, 'Role:', role)
    res.json({ user, token })
  } catch (err) {
    console.error('❌ Register error:', err.message)
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' })
    }

    const userData = { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role,
      teamLeadId: user.teamLeadId
    }
    const token = jwt.sign(userData, JWT_SECRET)

    console.log('✅ User logged in:', email, 'Role:', user.role)
    res.json({ user: userData, token })
  } catch (err) {
    console.error('❌ Login error:', err.message)
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

// User management routes
app.get('/api/users/team-leads', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const teamLeads = db.prepare(`
      SELECT id, name, email, createdAt,
        (SELECT COUNT(*) FROM users WHERE teamLeadId = u.id) as employeeCount
      FROM users u
      WHERE role = 'team_lead'
      ORDER BY name
    `).all()
    
    res.json(teamLeads)
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.get('/api/users/employees', authenticateToken, (req, res) => {
  try {
    let query = 'SELECT id, name, email, teamLeadId, createdAt FROM users WHERE role = ?'
    let params = ['employee']

    // Team leads can only see their employees
    if (req.user.role === 'team_lead') {
      query += ' AND teamLeadId = ?'
      params.push(req.user.id)
    }

    query += ' ORDER BY name'

    const employees = db.prepare(query).all(...params)
    res.json(employees)
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/users/:id/assign-team-lead', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can assign team leads' })
    }

    const { teamLeadId } = req.body
    const userId = req.params.id

    db.prepare('UPDATE users SET teamLeadId = ? WHERE id = ?').run(teamLeadId, userId)

    res.json({ message: 'Team lead assigned successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

// Notification routes
app.get('/api/notifications', authenticateToken, (req, res) => {
  try {
    const notifications = db.prepare(
      'SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50'
    ).all(req.user.id)
    
    res.json(notifications)
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.get('/api/notifications/unread-count', authenticateToken, (req, res) => {
  try {
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = 0'
    ).get(req.user.id)
    
    res.json({ count: result.count })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/notifications/:id/read', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?')
      .run(req.params.id, req.user.id)
    
    res.json({ message: 'Notification marked as read' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/notifications/read-all', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET isRead = 1 WHERE userId = ?')
      .run(req.user.id)
    
    res.json({ message: 'All notifications marked as read' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

// Call-in routes
app.post('/api/shifts/:id/call-in', authenticateToken, (req, res) => {
  try {
    const shiftId = req.params.id
    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId)

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }

    if (shift.claimedBy !== req.user.id) {
      return res.status(403).json({ error: 'This is not your shift' })
    }

    if (shift.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved shifts can be called in' })
    }

    db.prepare('UPDATE shifts SET isCallIn = 1, callInBy = ?, status = ?, claimedBy = NULL, approvedByTeamLead = 0, approvedByManager = 0 WHERE id = ?')
      .run(req.user.id, 'call-in', shiftId)

    const shiftDate = new Date(shift.date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    })

    notifyAllEmployees(
      shiftId,
      '🚨 URGENT: Call-In Coverage Needed!',
      `${req.user.name} needs coverage for ${shift.category} shift on ${shiftDate} from ${shift.startTime} - ${shift.endTime}. Can you cover this shift?`,
      'call-in',
      true
    )

    console.log(`🚨 Call-in initiated by user ${req.user.id} for shift ${shiftId}`)
    res.json({ message: 'Call-in posted! All employees have been notified.' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/shifts/:id/accept-call-in', authenticateToken, (req, res) => {
  try {
    const shiftId = req.params.id
    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId)

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }

    if (!shift.isCallIn || shift.status !== 'call-in') {
      return res.status(400).json({ error: 'This call-in has already been filled' })
    }

    // For call-ins, go straight to pending for team lead approval
    db.prepare('UPDATE shifts SET status = ?, claimedBy = ? WHERE id = ?')
      .run('pending', req.user.id, shiftId)

    const callInUser = db.prepare('SELECT name FROM users WHERE id = ?').get(shift.callInBy)
    const shiftDate = new Date(shift.date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    })

    notifyAllEmployees(
      shiftId,
      '✅ Call-In Coverage Accepted',
      `${req.user.name} has accepted coverage for ${callInUser.name}'s ${shift.category} shift on ${shiftDate}. Pending approval.`,
      'call-in-accepted',
      false
    )

    console.log(`✅ Call-in shift ${shiftId} accepted by user ${req.user.id}`)
    res.json({ message: 'You have successfully accepted this call-in shift! Pending approval.' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.get('/api/shifts/call-ins', authenticateToken, (req, res) => {
  try {
    const shifts = db.prepare(`
      SELECT s.*, u.name as callInByName
      FROM shifts s
      LEFT JOIN users u ON s.callInBy = u.id
      WHERE s.status = 'call-in' AND s.isCallIn = 1
      ORDER BY s.date, s.startTime
    `).all()
    
    res.json(shifts)
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

// Shift routes
app.post('/api/shifts/create', authenticateToken, (req, res) => {
  try {
    if (!['manager', 'team_lead'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const { date, startTime, endTime, category, isOvertime, teamLeadId } = req.body
    
    // Team leads can only create for themselves
    const assignedTeamLeadId = req.user.role === 'team_lead' ? req.user.id : (teamLeadId || null)
    
    const result = db.prepare(
      'INSERT INTO shifts (date, startTime, endTime, category, isOvertime, teamLeadId) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(date, startTime, endTime, category, isOvertime ? 1 : 0, assignedTeamLeadId)

    const shiftId = result.lastInsertRowid

    if (isOvertime) {
      const shiftDate = new Date(date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })
      notifyAllEmployees(
        shiftId,
        '🔥 NEW OVERTIME AVAILABLE!',
        `${category} shift on ${shiftDate} from ${startTime} - ${endTime}. Claim it now!`,
        'overtime',
        false
      )
    }

    console.log(`✅ ${isOvertime ? 'OVERTIME' : 'Regular'} shift created:`, shiftId)
    res.json({ id: shiftId })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.get('/api/shifts/available', authenticateToken, (req, res) => {
  try {
    const shifts = db.prepare('SELECT * FROM shifts WHERE status = ? ORDER BY isOvertime DESC, date, startTime').all('available')
    res.json(shifts)
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.get('/api/shifts/overtime', authenticateToken, (req, res) => {
  try {
    const shifts = db.prepare('SELECT * FROM shifts WHERE status = ? AND isOvertime = 1 ORDER BY date, startTime').all('available')
    res.json(shifts)
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.get('/api/shifts/all', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT s.*, u.name as claimedByName, tl.name as teamLeadName
      FROM shifts s
      LEFT JOIN users u ON s.claimedBy = u.id
      LEFT JOIN users tl ON s.teamLeadId = tl.id
    `
    let params = []

    // Team leads only see their shifts
    if (req.user.role === 'team_lead') {
      query += ' WHERE s.teamLeadId = ?'
      params.push(req.user.id)
    }

    query += ' ORDER BY s.date DESC, s.startTime'

    const shifts = db.prepare(query).all(...params)
    res.json(shifts)
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.get('/api/shifts/my-shifts', authenticateToken, (req, res) => {
  try {
    const shifts = db.prepare(
      'SELECT * FROM shifts WHERE claimedBy = ? ORDER BY date, startTime'
    ).all(req.user.id)
    
    res.json(shifts)
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.get('/api/shifts/pending-claims', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT s.*, u.name as claimedByName, u.teamLeadId
      FROM shifts s
      JOIN users u ON s.claimedBy = u.id
      WHERE s.status = 'pending'
    `
    let params = []

    // Team leads only see claims from their employees
    if (req.user.role === 'team_lead') {
      query += ' AND u.teamLeadId = ?'
      params.push(req.user.id)
    }

    query += ' ORDER BY s.date, s.startTime'

    const shifts = db.prepare(query).all(...params)
    res.json(shifts)
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/shifts/:id/claim', authenticateToken, (req, res) => {
  try {
    const shiftId = req.params.id
    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId)

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }

    if (shift.status !== 'available' && shift.status !== 'call-in') {
      return res.status(400).json({ error: 'Shift not available' })
    }

    db.prepare('UPDATE shifts SET status = ?, claimedBy = ? WHERE id = ?')
      .run('pending', req.user.id, shiftId)

    res.json({ message: 'Shift claimed successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/shifts/:id/approve-teamlead', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'team_lead') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id)
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }

    // Verify the employee belongs to this team lead
    const employee = db.prepare('SELECT teamLeadId FROM users WHERE id = ?').get(shift.claimedBy)
    if (employee.teamLeadId !== req.user.id) {
      return res.status(403).json({ error: 'This employee is not on your team' })
    }

    db.prepare('UPDATE shifts SET approvedByTeamLead = 1, status = ? WHERE id = ?')
      .run('pending-manager', req.params.id)

    // Notify the employee
    notifyUser(shift.claimedBy, '✅ Shift Approved by Team Lead', 
      `Your team lead has approved your shift claim. Final manager approval pending.`, 'approval')

    res.json({ message: 'Shift approved by team lead' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/shifts/:id/approve-manager', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id)
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }

    db.prepare('UPDATE shifts SET approvedByManager = 1, approvedByTeamLead = 1, status = ? WHERE id = ?')
      .run('approved', req.params.id)

    // Notify the employee
    notifyUser(shift.claimedBy, '✅ Shift Fully Approved', 
      `Your shift has been approved by management. It's now confirmed!`, 'approval')

    res.json({ message: 'Shift approved by manager' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/shifts/:id/reject', authenticateToken, (req, res) => {
  try {
    if (!['manager', 'team_lead'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id)
    
    if (req.user.role === 'team_lead') {
      const employee = db.prepare('SELECT teamLeadId FROM users WHERE id = ?').get(shift.claimedBy)
      if (employee.teamLeadId !== req.user.id) {
        return res.status(403).json({ error: 'This employee is not on your team' })
      }
    }

    db.prepare('UPDATE shifts SET status = ?, claimedBy = NULL, approvedByTeamLead = 0, approvedByManager = 0 WHERE id = ?')
      .run('available', req.params.id)

    // Notify the employee
    if (shift.claimedBy) {
      notifyUser(shift.claimedBy, '❌ Shift Claim Rejected', 
        `Your shift claim has been rejected and returned to available shifts.`, 'rejection')
    }
    
    res.json({ message: 'Claim rejected' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

// Time off routes
app.post('/api/timeoff/request', authenticateToken, (req, res) => {
  try {
    const { date, reason } = req.body
    const result = db.prepare(
      'INSERT INTO timeoff_requests (userId, date, reason) VALUES (?, ?, ?)'
    ).run(req.user.id, date, reason)

    // Notify team lead
    if (req.user.teamLeadId) {
      notifyUser(req.user.teamLeadId, '📅 New Time Off Request', 
        `${req.user.name} has requested time off. Please review.`, 'time-off')
    }

    res.json({ id: result.lastInsertRowid })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.get('/api/timeoff/my-requests', authenticateToken, (req, res) => {
  try {
    const requests = db.prepare(
      'SELECT * FROM timeoff_requests WHERE userId = ? ORDER BY date DESC'
    ).all(req.user.id)
    
    res.json(requests)
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.get('/api/timeoff/all-requests', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT t.*, u.name as userName, u.teamLeadId
      FROM timeoff_requests t
      JOIN users u ON t.userId = u.id
    `
    let params = []

    // Team leads only see requests from their employees
    if (req.user.role === 'team_lead') {
      query += ' WHERE u.teamLeadId = ?'
      params.push(req.user.id)
    }

    query += ' ORDER BY t.createdAt DESC'

    const requests = db.prepare(query).all(...params)
    res.json(requests)
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/timeoff/:id/approve-teamlead', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'team_lead') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const request = db.prepare('SELECT * FROM timeoff_requests WHERE id = ?').get(req.params.id)
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' })
    }

    const employee = db.prepare('SELECT teamLeadId FROM users WHERE id = ?').get(request.userId)
    if (employee.teamLeadId !== req.user.id) {
      return res.status(403).json({ error: 'This employee is not on your team' })
    }

    db.prepare('UPDATE timeoff_requests SET approvedByTeamLead = 1, status = ? WHERE id = ?')
      .run('pending-manager', req.params.id)

    notifyUser(request.userId, '✅ Time Off Approved by Team Lead', 
      `Your time off request has been approved by your team lead. Awaiting final manager approval.`, 'approval')

    res.json({ message: 'Time off approved by team lead' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/timeoff/:id/approve-manager', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const request = db.prepare('SELECT * FROM timeoff_requests WHERE id = ?').get(req.params.id)
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' })
    }

    db.prepare('UPDATE timeoff_requests SET approvedByManager = 1, approvedByTeamLead = 1, status = ? WHERE id = ?')
      .run('approved', req.params.id)

    const existingShift = db.prepare(
      'SELECT * FROM shifts WHERE date = ? AND claimedBy = ?'
    ).get(request.date, request.userId)

    if (existingShift) {
      db.prepare('UPDATE shifts SET status = ?, claimedBy = NULL, approvedByTeamLead = 0, approvedByManager = 0 WHERE id = ?')
        .run('available', existingShift.id)
    }

    notifyUser(request.userId, '✅ Time Off Fully Approved', 
      `Your time off request has been approved by management!`, 'approval')

    res.json({ message: 'Time off approved by manager' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/timeoff/:id/reject', authenticateToken, (req, res) => {
  try {
    if (!['manager', 'team_lead'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const request = db.prepare('SELECT * FROM timeoff_requests WHERE id = ?').get(req.params.id)
    
    if (req.user.role === 'team_lead') {
      const employee = db.prepare('SELECT teamLeadId FROM users WHERE id = ?').get(request.userId)
      if (employee.teamLeadId !== req.user.id) {
        return res.status(403).json({ error: 'This employee is not on your team' })
      }
    }

    db.prepare('UPDATE timeoff_requests SET status = ? WHERE id = ?')
      .run('rejected', req.params.id)

    notifyUser(request.userId, '❌ Time Off Request Rejected', 
      `Your time off request has been rejected.`, 'rejection')
    
    res.json({ message: 'Time off rejected' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

const PORT = 5001
app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('⏰ CLOCKWORK - BY BEECHWOOD')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Server running on: http://localhost:${PORT}`)
  console.log(`📊 Database file: beechwood.db`)
  console.log(`🔥 Ready to accept requests!`)
  console.log(`⚡ Overtime notifications: ENABLED`)
  console.log(`🚨 Call-in coverage: ENABLED`)
  console.log(`👔 Hierarchical roles: Manager → Team Lead → Employee`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})
