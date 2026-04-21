require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const entriesRoutes = require('./routes/entries');
const goalsRoutes = require('./routes/goals');
const usersRoutes = require('./routes/users');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS — only allow your frontend ──────────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:4173',
    ].filter(Boolean);
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ── Rate limiting — prevents brute force attacks ──────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please slow down.' },
});

app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/users', usersRoutes);

// ── Health check — Render and UptimeRobot use this ───────────────────────────
app.get('/', (req, res) => res.json({ 
  app: 'CarbonTrack API', 
  status: 'running',
  version: '1.0.0'
}));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});