// backend/app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");

// Register all models with Mongoose before any routes are defined
require('./models/user.model');
require('./models/project.model');
require('./models/kanban.model');
require('./models/kanbanTask.model');
require('./models/tag.model');
require('./models/counter.model');
require('./models/projectMember.model');
require('./models/team.model');
require('./models/teamMember.model');
require('./models/projectType.model');
require('./models/notification.model');
require('./models/personalMemberList.model');
require('./models/teamActivity.model');
require('./models/userWidget.model');
require('./models/widget.model');
require('./models/document.model');
require('./models/payment.model'); // Payment model for MoMo integration

// Feature toggles for safe operation
const { isFeatureEnabled, featureToggleMiddleware, getEnabledFeatures, getDisabledFeatures } = require('./config/featureToggles');

// Only import routes for enabled features
const adminRoutes = require('./routes/admin.routes');
const projectRoutes = require('./routes/project.routes');
const projectMemberRoutes = require('./routes/projectMember.routes');
const teamRoutes = require('./routes/team.routes');
const projectTypeRoutes = require('./routes/projectType.routes'); // Always enable - essential for projects
const { generalRateLimit } = require('./middleware/rateLimiting');

// Conditionally import complex features only if enabled
let widgetRoutes, notificationRoutes, kanbanRoutes, kanbanTaskRoutes, personalMemberListRoutes, teamEnhancedRoutes, userRoleRoutes;

if (isFeatureEnabled('CUSTOM_WIDGETS')) {
  widgetRoutes = require("./routes/widgetRoutes");
}
if (isFeatureEnabled('REAL_TIME_NOTIFICATIONS')) {
  notificationRoutes = require('./routes/notification.routes');
}
if (isFeatureEnabled('ENHANCED_TEAMS')) {
  teamEnhancedRoutes = require('./routes/teamEnhanced.routes');
}
if (isFeatureEnabled('ADVANCED_SEARCH')) {
  kanbanRoutes = require('./routes/kanban.routes');
  kanbanTaskRoutes = require('./routes/kanbanTask.routes');
  personalMemberListRoutes = require('./routes/personalMemberList.routes');
  userRoleRoutes = require('./routes/userRole.routes');
}

// Load user permissions routes (for role-based access control)
const userPermissionsRoutes = require('./routes/userPermissions.routes');

// Load biến môi trường từ .env
dotenv.config();

const app = express();

// Import timeout middleware
const timeout = require('connect-timeout');

// --- ENHANCED REQUEST TIMEOUT MIDDLEWARE ---
// Read timeout settings from environment (defaults to 15s)
const TIMEOUT_SECONDS = process.env.REQUEST_TIMEOUT || '15s';
const TIMEOUT_MS = process.env.REQUEST_TIMEOUT_MS ? parseInt(process.env.REQUEST_TIMEOUT_MS, 10) : 15000; // milliseconds

// 1. Đặt thời gian chờ
app.use(timeout(TIMEOUT_SECONDS));

// 2. Middleware để theo dõi và ghi log chi tiết khi timeout xảy ra
const enhancedTimeoutHandler = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `${req.method}-${req.originalUrl}-${startTime}`;
  
  // Thêm flag để theo dõi trạng thái timeout response
  req.timeoutResponseSent = false;

  // Ghi log bắt đầu request
  console.log(`🚀 [${new Date().toISOString()}] START Request: ${requestId}`);
  console.log(`   📍 Endpoint: ${req.method} ${req.originalUrl}`);
  console.log(`   👤 User: ${req.user ? req.user.userId || req.user.id || 'Unknown' : 'Not authenticated'}`);
  console.log(`   🔗 IP: ${req.ip || req.connection.remoteAddress}`);
  
  // Lắng nghe sự kiện 'timeout' trên mỗi request
  req.on('timeout', () => {
    const duration = Date.now() - startTime;
    console.error(`\n❌❌❌ CRITICAL TIMEOUT DETECTED ❌❌❌`);
    console.error(`🔥 Request ID: ${requestId}`);
    console.error(`🔥 Endpoint: ${req.method} ${req.originalUrl}`);
    console.error(`🔥 Duration: ${duration}ms (exceeded ${TIMEOUT_MS}ms limit)`);
    console.error(`🔥 User: ${req.user ? req.user.userId || req.user.id || 'Unknown' : 'Not authenticated'}`);
    console.error(`🔥 Request Body:`, JSON.stringify(req.body, null, 2));
    console.error(`🔥 Query Params:`, JSON.stringify(req.query, null, 2));
    console.error(`🔥 Route Params:`, JSON.stringify(req.params, null, 2));
    console.error(`🔥 Headers:`, JSON.stringify({
      'user-agent': req.get('User-Agent'),
      'content-type': req.get('Content-Type'),
      'authorization': req.get('Authorization') ? 'Bearer [HIDDEN]' : 'None'
    }, null, 2));
    console.error(`❌❌❌ END TIMEOUT REPORT ❌❌❌\n`);
    
    // Chỉ gửi lỗi 503 nếu response chưa được gửi và flag chưa được set
    if (!res.headersSent && !req.timeoutResponseSent) {
      req.timeoutResponseSent = true; // Đánh dấu đã gửi timeout response
      res.status(503).json({ 
        success: false,
        message: `Service Unavailable: Request timed out after ${TIMEOUT_SECONDS}`,
        error: 'TIMEOUT',
        requestId: requestId,
        duration: duration
      });
    }
  });

  // Lắng nghe khi response hoàn thành
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) { // Log các request chậm hơn 5 giây
      console.warn(`⚠️ SLOW Request: ${requestId} took ${duration}ms (Status: ${res.statusCode})`);
    } else {
      console.log(`✅ [${new Date().toISOString()}] COMPLETED Request: ${requestId} in ${duration}ms (Status: ${res.statusCode})`);
    }
  });

  next();
};

app.use(enhancedTimeoutHandler);

// 3. Middleware bảo vệ cuối cùng để xử lý timeout
const haltOnTimedout = (req, res, next) => {
  if (!req.timedout) {
    next();
  } else {
    // Backup handler nếu event listener không hoạt động
    const requestId = `${req.method}-${req.originalUrl}-${Date.now()}`;
    console.error(`🛑 BACKUP TIMEOUT HANDLER: ${requestId}`);

    // Chỉ gửi response nếu chưa có timeout response nào được gửi
    if (!res.headersSent && !req.timeoutResponseSent) {
      req.timeoutResponseSent = true; // Đánh dấu đã gửi timeout response
      res.status(503).json({ 
        success: false,
        message: 'Service unavailable. Request timed out.',
        error: 'TIMEOUT'
      });
    } else {
      console.error(`🚨 BACKUP TIMEOUT HANDLER: Headers already sent for ${requestId}`);
    }
  }
};

app.use(haltOnTimedout);
// ----------------------------------

// Cấu hình CORS chi tiết
const corsOptions = {
  origin: [
    'http://localhost:3000', // Local development
    'https://uniplan-frontend-production.up.railway.app', // New UniPlan frontend
    'https://web-production-435e4.up.railway.app' // Old frontend (backup)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Trust proxy for Railway deployment
app.set('trust proxy', true);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Serve static files for uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.IO requests handling - Allow when feature is enabled
app.use((req, res, next) => {
  // Check if this is a Socket.IO request
  if (req.url.startsWith('/socket.io/')) {
    if (!isFeatureEnabled('SOCKET_IO')) {
      console.log('⚠️  Socket.IO request blocked - feature disabled');
      res.statusCode = 404;
      res.end();
      return;
    } else {
      console.log('✅ Socket.IO request allowed - feature enabled');
    }
  }
  next();
});

// Custom morgan logging that skips Socket.IO requests (backup safety)
app.use(morgan("dev", {
  skip: function (req, res) { 
    return req.url.startsWith('/socket.io/'); 
  }
}));

// Apply general rate limiting to all requests
app.use(generalRateLimit);

// Middleware để gán io vào mỗi request
app.use((req, res, next) => {
  req.io = req.app.get('socketio');
  next();
});

// Middleware para truyền server (io) vào request (được set từ server.js)
// Chỉ áp dụng nếu Socket.IO được bật
if (isFeatureEnabled('SOCKET_IO')) {
  app.use((req, res, next) => {
    req.server = req.app.get('server'); // Lấy server từ app (đã được set trong server.js)
    next();
  });
}



// System status endpoint
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    features: {
      enabled: getEnabledFeatures(),
      disabled: getDisabledFeatures(),
      total: getEnabledFeatures().length + getDisabledFeatures().length
    },
    message: 'UniPlan Backend - Safe Mode with Feature Toggles'
  });
});

// Public health check endpoint (no authentication required)
app.get('/api/health', (req, res) => {
  const startTime = Date.now();
  
  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      responseTime: Date.now() - startTime,
      message: 'UniPlan Backend is running normally'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database health check endpoint
app.get('/api/database/health', (req, res) => {
  const { getConnectionStatus } = require('./config/db');
  
  try {
    const dbStatus = getConnectionStatus();
    const healthInfo = {
      database: {
        status: dbStatus.state,
        name: dbStatus.name,
        host: dbStatus.host,
        port: dbStatus.port
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    // Return appropriate HTTP status
    const isHealthy = dbStatus.state === 'connected';
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      message: isHealthy ? 'Database connection is healthy' : 'Database connection issues detected',
      data: healthInfo
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to check database health',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root route for health check
app.get('/', (req, res) => {
  res.json({
    message: 'UniPlan Backend API is running!',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes - Only include routes for enabled features
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/password", require("./routes/password.routes"));

// Debug routes for testing timeout middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', require('./routes/debug.routes'));
  console.log('🐛 Debug routes enabled for timeout testing');
}

// Document upload routes - Always enabled (essential feature)
app.use('/api/documents', require('./routes/document.routes'));

// Avatar routes - For handling user avatars stored in MongoDB
app.use('/api/avatar', require('./routes/avatar.routes'));

// Payment routes - Always enabled (core business feature)
app.use('/api/payment', require('./routes/payment.routes'));

// Subscription routes - for subscription status and notifications
app.use('/api/subscription', require('./routes/subscription.routes'));

// IMPORTANT: Place specific routes BEFORE generic/dynamic routes
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamRoutes); // Specific route first
app.use('/api/teams-simple', require('./routes/teamSimpleRoutes')); // Simple team search functionality
app.use('/api/users', require('./routes/user.routes')); // Route cho users

// ===== CONDITIONAL SPECIFIC ROUTES (Only if features are enabled) =====
if (isFeatureEnabled('ADVANCED_SEARCH') && personalMemberListRoutes) {
  app.use('/api/personal-members', featureToggleMiddleware('ADVANCED_SEARCH'), personalMemberListRoutes);
}

// Place project-types BEFORE dynamic project routes
app.use('/api', projectTypeRoutes); // Essential for project creation - must come before dynamic routes

// Place dynamic routes AFTER specific ones
app.use('/api', projectRoutes); // This contains /projects/:id which should be after specific routes
app.use('/api', projectMemberRoutes); // Changed from /api/project-members to /api to support /api/projects/:id/members routes

// ===== CONDITIONAL ROUTES (Only if features are enabled) =====
if (isFeatureEnabled('CUSTOM_WIDGETS') && widgetRoutes) {
  app.use("/api/widgets", featureToggleMiddleware('CUSTOM_WIDGETS'), widgetRoutes);
}

if (isFeatureEnabled('REAL_TIME_NOTIFICATIONS') && notificationRoutes) {
  app.use('/api', featureToggleMiddleware('REAL_TIME_NOTIFICATIONS'), notificationRoutes);
}

if (isFeatureEnabled('ENHANCED_TEAMS') && teamEnhancedRoutes) {
  app.use('/api/teams-enhanced', featureToggleMiddleware('ENHANCED_TEAMS'), teamEnhancedRoutes);
}

if (isFeatureEnabled('ADVANCED_SEARCH')) {
  if (kanbanRoutes) app.use('/api/kanban', featureToggleMiddleware('ADVANCED_SEARCH'), kanbanRoutes);
  if (kanbanTaskRoutes) app.use('/api/kanban-tasks', featureToggleMiddleware('ADVANCED_SEARCH'), kanbanTaskRoutes);
  if (userRoleRoutes) app.use('/api/user-roles', featureToggleMiddleware('ADVANCED_SEARCH'), userRoleRoutes);
}

// User permissions routes (for role-based access control)
app.use('/api/user-permissions', userPermissionsRoutes);

// ===== HEALTH CHECK ENDPOINT FOR RAILWAY DOCKER =====
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'UniPlan Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = app;
