const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const http = require('http');
const { initSocket } = require('./utils/socket');

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

// Security Middleware
app.use(helmet());
app.use(cookieParser());
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        const frontendUrl = process.env.FRONTEND_URL;
        const allowedOrigins = [
            frontendUrl,
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5500', // Common Live Server port
            'http://127.0.0.1:5500'
        ].filter(Boolean);

        if (allowedOrigins.indexOf(origin) !== -1 || origin === 'null') {
            callback(null, true);
        } else {
            // In production, we should be strict. In dev, we can log and allow.
            if (process.env.NODE_ENV === 'production') {
                callback(new Error('Not allowed by CORS'));
            } else {
                callback(null, true);
            }
        }
    },
    credentials: true
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased limit for dashboard usage
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});
app.use('/api/', limiter);

app.use(express.json());
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`[server] hLPU Backend running on port ${PORT}`);
});
