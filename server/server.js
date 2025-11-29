const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const testCaseRoutes = require('./routes/testCaseRoutes');
const exportRoutes = require('./routes/exportRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/testcases', testCaseRoutes);
app.use('/api/export', exportRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    storage: 'In-Memory',
    groqApiKey: process.env.GROQ_API_KEY ? 'Configured' : 'Missing'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Generate Test Case API',
    version: '1.0.0',
    storage: 'In-Memory',
    endpoints: {
      health: '/api/health',
      testcases: '/api/testcases',
      generate: '/api/testcases/generate',
      statistics: '/api/testcases/statistics',
      export: '/api/export'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Server started successfully!');
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`💾 Storage: In-Memory (no database)`);
  console.log(`🔑 Groq API Key: ${process.env.GROQ_API_KEY ? 'Configured ✓' : 'Missing ✗'}`);
  console.log('═══════════════════════════════════════════════════════════');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});