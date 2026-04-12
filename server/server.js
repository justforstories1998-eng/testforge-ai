const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// 1. Load environment variables FIRST
// This ensures GROQ_API_KEY is available globally immediately
dotenv.config({ path: '../.env' }); 

// 2. Import routes
const testCaseRoutes = require('./routes/testCaseRoutes');
const exportRoutes = require('./routes/exportRoutes');

const app = express();

// 3. Unified CORS Configuration
// This handles both local development and your production Netlify site
const allowedOrigins = [
  'https://testforge-ai.netlify.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Access denied by CORS policy'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicitly handle OPTIONS (preflight) requests for all routes
app.options('*', cors(corsOptions));

// 4. Body Parsing Middleware
// Limits are set to 10mb to handle potential image uploads or large user stories
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} request to ${req.path}`);
  next();
});

// 5. API Routes
app.use('/api/testcases', testCaseRoutes);
app.use('/api/export', exportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Healthy',
    timestamp: new Date().toISOString(),
    engine: 'Groq Llama-3.3',
    apiKeyStatus: process.env.GROQ_API_KEY ? 'Active' : 'Missing'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TestForge AI API',
    version: '1.0.0',
    status: 'Operational'
  });
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    error: 'The requested resource was not found on this server',
    path: req.path
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Internal Server Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred',
    success: false
  });
});

// 6. Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('-----------------------------------------------------------');
  console.log(`System: TestForge AI Backend Protocol`);
  console.log(`Status: Operational on Port ${PORT}`);
  console.log(`CORS: Allowed for ${allowedOrigins.join(', ')}`);
  console.log(`AI Configuration: ${process.env.GROQ_API_KEY ? 'Validated' : 'Action Required'}`);
  console.log('-----------------------------------------------------------');
});

// Process handlers for stability
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception Error:', err);
  process.exit(1);
});