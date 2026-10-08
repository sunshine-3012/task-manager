const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('./supabase');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Parsing Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, '../public')));

/**
 * GET /api/config
 * Exposes safe public Supabase configuration to frontend client
 */
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL || '',
    supabaseAnonKey: SUPABASE_ANON_KEY || ''
  });
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
  });
});

// API Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

// SPA / HTML Navigation Fallbacks
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Root catch-all serves index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred'
  });
});

// Start listener when running locally or directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Task Manager Server running on: http://localhost:${PORT}`);
    console.log(`📁 Frontend served from: public/`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`==================================================\n`);
  });
}

module.exports = app;
