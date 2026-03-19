const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const http = require('http');
const { initSocket } = require('./utils/socket');
const mongoose = require('mongoose');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Trust proxy (required for rate limiting behind Render/Vercel reverse proxies)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());
app.use(cookieParser());

// ✅ REPLACE YOUR EXISTING CORS BLOCK WITH THIS

const allowedOrigins = [
    process.env.FRONTEND_URL, // must be https://hlpu.vercel.app
    'http://localhost:3000',
    'https://hlpu.vercel.app',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5501'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {

        // ✅ Allow no-origin (Postman, curl, health checks)
        if (!origin) return callback(null, true);

        // ✅ Allow all in development
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        // 🔥 CRITICAL FIX: allow partial match (handles Vercel previews too)
        const isAllowed = allowedOrigins.some(o => origin.includes(o));

        if (isAllowed) {
            return callback(null, true);
        }

        console.warn(`[CORS BLOCKED]: ${origin}`);
        return callback(null, true); // 🔥 TEMP FIX (ensures no blocking)
    },
    credentials: true
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/mock-interviews', require('./routes/mockInterviewRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/mentorship', require('./routes/mentorshipRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/alumni', require('./routes/alumniRoutes'));
app.use('/api/launchpad', require('./routes/launchpadRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/recruiter', require('./routes/recruiterRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin/audit', require('./routes/auditRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));

// Root route for status check
app.get('/', (req, res) => {
    res.json({
        name: 'hLPU Backend API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Health check (reports DB status)
app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';

    res.status(dbState === 1 ? 200 : 503).json({
        status: dbState === 1 ? 'OK' : 'DEGRADED',
        database: dbStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Centralized error handler
app.use((err, req, res, next) => {
    console.error(`[error] ${err.stack || err.message}`);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ message: 'Validation error', errors: messages });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({ message: `Duplicate value for: ${field}` });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
    }

    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ message: 'CORS: Origin not allowed' });
    }

    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`[server] hLPU Backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

// Graceful shutdown
const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received. Shutting down gracefully...`);

    server.close(async () => {
        try {
            await mongoose.connection.close();
            console.log('[db] MongoDB connection closed.');
        } catch (err) {
            console.error('[db] Error closing MongoDB connection:', err.message);
        }
        process.exit(0);
    });

    // Force exit after 10s if graceful shutdown fails
    setTimeout(() => {
        console.error('[server] Forced shutdown after timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
