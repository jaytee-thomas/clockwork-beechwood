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

console.log('🔧 Starting Shift Manager server...')

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
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      category TEXT NOT NULL,
      isOvertime INTEGER DEFAULT 0,
      status TEXT DEFAULT 'available',
      claimedBy INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (claimedBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS timeoff_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
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
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (shiftId) REFERENCES shifts(id)
    );
  `)
  console.log('✅ Database tables created/verified')
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

// Helper function to notify all employees
const notifyAllEmployees = (shiftId, title, message) => {
  try {
    const employees = db.prepare('SELECT id FROM users WHERE role = ?').all('employee')
    
    const stmt = db.prepare(
      'INSERT INTO notifications (userId, type, title, message, shiftId) VALUES (?, ?, ?, ?, ?)'
    )
    
    employees.forEach(employee => {
      stmt.run(employee.id, 'overtime', title, message, shiftId)
    })
    
    console.log(`✅ Notified ${employees.length} employees about new overtime`)
  } catch (err) {
    console.error('❌ Error sending notifications:', err.message)
  }
}

// Test route
app.get('/api/test', (req, res) => {
  console.log('✅ Test endpoint hit')
  res.json({ message: 'Server is running!', timestamp: new Date().toISOString() })
})

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  console.log('📝 ===== REGISTER REQUEST =====')
  console.log('Body received:', req.body)
  
  try {
    const { email, password, name, role } = req.body

    if (!email || !password || !name || !role) {
      console.log('❌ Missing required fields')
      return res.status(400).json({ error: 'All fields are required' })
    }

    console.log('Checking if user exists:', email)
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    
    if (existingUser) {
      console.log('❌ User already exists:', email)
      return res.status(400).json({ error: 'User already exists with this email' })
    }

    console.log('Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 10)

    console.log('Creating user in database...')
    const result = db.prepare(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)'
    ).run(email, hashedPassword, name, role)

    const user = { id: result.lastInsertRowid, email, name, role }
    const token = jwt.sign(user, JWT_SECRET)

    console.log('✅ User registered successfully:', email, 'Role:', role)
    res.json({ user, token })
  } catch (err) {
    console.error('❌ Register error:', err.message)
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  console.log('🔐 ===== LOGIN REQUEST =====')
  console.log('Body received:', req.body)
  
  try {
    const { email, password } = req.body

    if (!email || !password) {
      console.log('❌ Missing email or password')
      return res.status(400).json({ error: 'Email and password are required' })
    }

    console.log('Looking up user:', email)
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    
    if (!user) {
      console.log('❌ User not found:', email)
      return res.status(400).json({ error: 'Invalid email or password' })
    }

    console.log('User found, checking password...')
    const validPassword = await bcrypt.compare(password, user.password)
    
    if (!validPassword) {
      console.log('❌ Invalid password for:', email)
      return res.status(400).json({ error: 'Invalid email or password' })
    }

    const userData = { id: user.id, email: user.email, name: user.name, role: user.role }
    const token = jwt.sign(userData, JWT_SECRET)

    console.log('✅ User logged in successfully:', email, 'Role:', user.role)
    res.json({ user: userData, token })
  } catch (err) {
    console.error('❌ Login error:', err.message)
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

// Shift routes
app.post('/api/shifts/create', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const { date, startTime, endTime, category, isOvertime } = req.body
    const result = db.prepare(
      'INSERT INTO shifts (date, startTime, endTime, category, isOvertime) VALUES (?, ?, ?, ?, ?)'
    ).run(date, startTime, endTime, category, isOvertime ? 1 : 0)

    const shiftId = result.lastInsertRowid

    // If it's overtime, notify ALL employees
    if (isOvertime) {
      const shiftDate = new Date(date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })
      notifyAllEmployees(
        shiftId,
        '🔥 NEW OVERTIME AVAILABLE!',
        `${category} shift on ${shiftDate} from ${startTime} - ${endTime}. Claim it now!`
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
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const shifts = db.prepare(`
      SELECT s.*, u.name as claimedByName
      FROM shifts s
      LEFT JOIN users u ON s.claimedBy = u.id
      ORDER BY s.date DESC, s.startTime
    `).all()
    
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
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const shifts = db.prepare(`
      SELECT s.*, u.name as claimedByName
      FROM shifts s
      JOIN users u ON s.claimedBy = u.id
      WHERE s.status = 'pending'
      ORDER BY s.date, s.startTime
    `).all()
    
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

    if (shift.status !== 'available') {
      return res.status(400).json({ error: 'Shift not available' })
    }

    db.prepare('UPDATE shifts SET status = ?, claimedBy = ? WHERE id = ?')
      .run('pending', req.user.id, shiftId)

    res.json({ message: 'Shift claimed successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/shifts/:id/approve', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    db.prepare('UPDATE shifts SET status = ? WHERE id = ?').run('approved', req.params.id)
    res.json({ message: 'Shift approved' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/shifts/:id/reject', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    db.prepare('UPDATE shifts SET status = ?, claimedBy = NULL WHERE id = ?')
      .run('available', req.params.id)
    
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
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const requests = db.prepare(`
      SELECT t.*, u.name as userName
      FROM timeoff_requests t
      JOIN users u ON t.userId = u.id
      ORDER BY t.createdAt DESC
    `).all()
    
    res.json(requests)
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/timeoff/:id/approve', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const request = db.prepare('SELECT * FROM timeoff_requests WHERE id = ?').get(req.params.id)
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' })
    }

    db.prepare('UPDATE timeoff_requests SET status = ? WHERE id = ?')
      .run('approved', req.params.id)

    const existingShift = db.prepare(
      'SELECT * FROM shifts WHERE date = ? AND claimedBy = ?'
    ).get(request.date, request.userId)

    if (existingShift) {
      db.prepare('UPDATE shifts SET status = ?, claimedBy = NULL WHERE id = ?')
        .run('available', existingShift.id)
    }

    res.json({ message: 'Time off approved' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.post('/api/timeoff/:id/reject', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    db.prepare('UPDATE timeoff_requests SET status = ? WHERE id = ?')
      .run('rejected', req.params.id)
    
    res.json({ message: 'Time off rejected' })
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

const PORT = 5001
app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 SHIFT MANAGER - BY BEECHWOOD')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Server running on: http://localhost:${PORT}`)
  console.log(`📊 Database file: beechwood.db`)
  console.log(`🔥 Ready to accept requests!`)
  console.log(`⚡ Overtime notifications: ENABLED`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})
